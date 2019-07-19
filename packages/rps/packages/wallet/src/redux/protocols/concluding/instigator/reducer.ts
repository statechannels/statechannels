import * as states from './states';
import {
  InstigatorConcludingState as CState,
  InstigatorNonTerminalState as NonTerminalCState,
  instigatorApproveConcluding,
  instigatorWaitForOpponentConclude,
  instigatorAcknowledgeFailure,
} from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import {
  SharedData,
  getChannel,
  setChannelStore,
  queueMessage,
  checkAndStore,
} from '../../../state';
import { composeConcludeCommitment } from '../../../../utils/commitment-utils';
import { ourTurn } from '../../../channel-store';
import * as channelStoreReducer from '../../../channel-store/reducer';
import * as selectors from '../../../selectors';
import {
  showWallet,
  sendConcludeSuccess,
  hideWallet,
  sendConcludeFailure,
} from '../../reducer-helpers';
import { ProtocolAction } from '../../../../redux/actions';
import { theirAddress } from '../../../channel-store';
import { sendConcludeInstigated, CommitmentReceived } from '../../../../communication';
import { failure, success } from '../states';
import { ProtocolStateWithSharedData, makeLocator } from '../..';
import { isConcludingInstigatorAction } from './actions';
import {
  initialize as consensusUpdateInitialize,
  consensusUpdateReducer,
  CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
} from '../../consensus-update/reducer';
import * as helpers from '../../reducer-helpers';
import {
  ConsensusUpdateAction,
  isConsensusUpdateAction,
  clearedToSend,
} from '../../consensus-update/actions';
export type ReturnVal = ProtocolStateWithSharedData<states.InstigatorConcludingState>;
export type Storage = SharedData;
export function instigatorConcludingReducer(
  protocolState: NonTerminalCState,
  sharedData: SharedData,
  action: ProtocolAction,
): ReturnVal {
  if (action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED') {
    return concludeReceived(action, protocolState, sharedData);
  }
  if (isConsensusUpdateAction(action)) {
    return handleLedgerUpdateAction(protocolState, sharedData, action);
  }

  if (!isConcludingInstigatorAction(action)) {
    return { protocolState, sharedData };
  }

  switch (action.type) {
    case 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDING_CANCELLED':
      return concludingCancelled(protocolState, sharedData);
    case 'WALLET.CONCLUDING.INSTIGATOR.CONCLUDE_APPROVED':
      return concludeApproved(protocolState, sharedData);
    case 'WALLET.CONCLUDING.INSTIGATOR.DEFUND_CHOSEN':
      return defundChosen(protocolState, sharedData);
    case 'WALLET.CONCLUDING.INSTIGATOR.ACKNOWLEDGED':
      return acknowledged(protocolState, sharedData);
    case 'WALLET.CONCLUDING.INSTIGATOR.KEEP_OPEN_CHOSEN':
      return keepOpenChosen(protocolState, sharedData);
    default:
      return unreachable(action);
  }
}

export function initialize(channelId: string, processId: string, sharedData: Storage): ReturnVal {
  const channelState = getChannel(sharedData, channelId);
  if (!channelState) {
    return {
      protocolState: instigatorAcknowledgeFailure({
        processId,
        channelId,
        reason: 'ChannelDoesntExist',
      }),
      sharedData,
    };
  }
  if (ourTurn(channelState)) {
    // if it's our turn now, we may resign
    return {
      protocolState: instigatorApproveConcluding({ channelId, processId }),
      sharedData: showWallet(sharedData),
    };
  } else {
    return {
      protocolState: instigatorAcknowledgeFailure({
        channelId,
        processId,
        reason: 'NotYourTurn',
      }),
      sharedData,
    };
  }
}

function handleLedgerUpdateAction(
  protocolState: NonTerminalCState,
  sharedData: Storage,
  action: ConsensusUpdateAction,
): ReturnVal {
  if (
    protocolState.type !== 'ConcludingInstigator.WaitForLedgerUpdate' &&
    protocolState.type !== 'ConcludingInstigator.AcknowledgeConcludeReceived'
  ) {
    return { protocolState, sharedData };
  }
  if (!protocolState.consensusUpdateState) {
    throw new Error('Expected Consensus State to be defined.');
  }
  const {
    protocolState: updatedConsensusUpdateState,
    sharedData: newSharedData,
  } = consensusUpdateReducer(protocolState.consensusUpdateState, sharedData, action);
  if (updatedConsensusUpdateState.type === 'ConsensusUpdate.Success') {
    return {
      protocolState: states.instigatorAcknowledgeSuccess(protocolState),
      sharedData: newSharedData,
    };
  } else if (updatedConsensusUpdateState.type === 'ConsensusUpdate.Failure') {
    return {
      protocolState: states.instigatorAcknowledgeFailure({
        ...protocolState,
        reason: 'LedgerUpdateFailed',
      }),
      sharedData: newSharedData,
    };
  } else {
    return {
      protocolState: states.instigatorWaitForLedgerUpdate({
        ...protocolState,
        consensusUpdateState: updatedConsensusUpdateState,
      }),
      sharedData: newSharedData,
    };
  }
}

function concludingCancelled(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingInstigator.ApproveConcluding') {
    return { protocolState, sharedData };
  }
  return {
    protocolState: failure({ reason: 'ConcludeCancelled' }),
    sharedData: sendConcludeFailure(hideWallet(sharedData), 'UserDeclined'),
  };
}

function concludeApproved(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingInstigator.ApproveConcluding') {
    return { protocolState, sharedData };
  }

  const channelState = getChannel(sharedData, protocolState.channelId);

  if (channelState) {
    const sharedDataWithOwnCommitment = createAndSendConcludeCommitment(
      sharedData,
      protocolState.channelId,
    );

    return {
      protocolState: instigatorWaitForOpponentConclude({ ...protocolState }),
      sharedData: sendConcludeSuccess(sharedDataWithOwnCommitment),
    };
  } else {
    return { protocolState, sharedData };
  }
}

function concludeReceived(
  action: CommitmentReceived,
  protocolState: NonTerminalCState,
  sharedData: Storage,
): ReturnVal {
  if (protocolState.type !== 'ConcludingInstigator.WaitForOpponentConclude') {
    return { protocolState, sharedData };
  }
  const { signedCommitment } = action;
  const checkResult = checkAndStore(sharedData, signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Concluding instigator protocol, unable to validate or store commitment');
  }

  sharedData = checkResult.store;
  const fundingState = selectors.getChannelFundingState(sharedData, protocolState.channelId);
  if (fundingState && !fundingState.directlyFunded) {
    const latestCommitment = helpers.getLatestCommitment(protocolState.channelId, sharedData);
    const ledgerId = helpers.getFundingChannelId(protocolState.channelId, sharedData);

    const consensusUpdateResult = consensusUpdateInitialize(
      protocolState.processId,
      ledgerId,
      false,
      latestCommitment.allocation,
      latestCommitment.destination,
      makeLocator(CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
      sharedData,
    );
    sharedData = consensusUpdateResult.sharedData;
    return {
      protocolState: states.instigatorAcknowledgeConcludeReceived({
        ...protocolState,
        consensusUpdateState: consensusUpdateResult.protocolState,
      }),
      sharedData,
    };
  } else {
    return {
      protocolState: states.instigatorAcknowledgeConcludeReceived(protocolState),
      sharedData,
    };
  }
}

function keepOpenChosen(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingInstigator.AcknowledgeConcludeReceived') {
    return { protocolState, sharedData };
  }
  if (!protocolState.consensusUpdateState) {
    throw new Error('Expected Consenus state to be defined.');
  }
  const consensusUpdateResult = consensusUpdateReducer(
    protocolState.consensusUpdateState,
    sharedData,
    clearedToSend({
      protocolLocator: makeLocator(CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
      processId: protocolState.processId,
    }),
  );
  sharedData = consensusUpdateResult.sharedData;
  if (consensusUpdateResult.protocolState.type === 'ConsensusUpdate.Success') {
    return {
      protocolState: states.instigatorAcknowledgeSuccess(protocolState),
      sharedData,
    };
  } else if (consensusUpdateResult.protocolState.type === 'ConsensusUpdate.Failure') {
    return {
      protocolState: states.instigatorAcknowledgeFailure({
        ...protocolState,
        reason: 'LedgerUpdateFailed',
      }),
      sharedData,
    };
  } else {
    return {
      protocolState: states.instigatorWaitForLedgerUpdate({
        ...protocolState,
        consensusUpdateState: consensusUpdateResult.protocolState,
      }),
      sharedData,
    };
  }
}

function defundChosen(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingInstigator.AcknowledgeConcludeReceived') {
    return { protocolState, sharedData };
  }
  return {
    protocolState: success({}),
    sharedData,
  };
}

function acknowledged(protocolState: CState, sharedData: Storage): ReturnVal {
  switch (protocolState.type) {
    case 'ConcludingInstigator.AcknowledgeSuccess':
      return {
        protocolState: success({}),
        sharedData: hideWallet(sharedData),
      };
    case 'ConcludingInstigator.AcknowledgeFailure':
      return {
        protocolState: failure({ reason: protocolState.reason }),
        sharedData: sendConcludeFailure(hideWallet(sharedData), 'Other'),
      };
    default:
      return { protocolState, sharedData };
  }
}

// Helpers

const createAndSendConcludeCommitment = (sharedData: SharedData, channelId: string): SharedData => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);

  const commitment = composeConcludeCommitment(channelState);

  const signResult = channelStoreReducer.signAndStore(sharedData.channelStore, commitment);
  if (signResult.isSuccess) {
    const sharedDataWithOwnCommitment = setChannelStore(sharedData, signResult.store);
    const messageRelay = sendConcludeInstigated(
      theirAddress(channelState),
      channelId,
      signResult.signedCommitment,
    );
    return queueMessage(sharedDataWithOwnCommitment, messageRelay);
  } else {
    throw new Error(
      `Concluding Instigator protocol, createAndSendConcludeCommitment, unable to sign commitment: ${
        signResult.reason
      }`,
    );
  }
};
