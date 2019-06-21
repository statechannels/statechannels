import * as states from './states';
import {
  ResponderConcludingState as CState,
  ResponderNonTerminalState as NonTerminalCState,
  approveConcluding,
  waitForDefund,
  acknowledgeSuccess,
  acknowledgeFailure,
  decideDefund,
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
import { ourTurn, getLastCommitment } from '../../../channel-store';
import { DefundingAction, isDefundingAction } from '../../defunding/actions';
import { initialize as initializeDefunding, defundingReducer } from '../../defunding/reducer';
import { isSuccess, isFailure } from '../../defunding/states';
import * as selectors from '../../../selectors';
import * as channelStoreReducer from '../../../channel-store/reducer';
import { theirAddress } from '../../../channel-store';
import { sendCommitmentReceived, sendKeepLedgerChannelApproved } from '../../../../communication';
import {
  showWallet,
  hideWallet,
  sendConcludeFailure,
  sendOpponentConcluded,
} from '../../reducer-helpers';
import { ProtocolAction } from '../../../../redux/actions';
import { isConcludingResponderAction } from './actions';
import { getChannelId, SignedCommitment } from '../../../../domain';
import { failure, success } from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { waitForLedgerUpdate } from '../../indirect-defunding/states';
import { waitForLedgerDefunding } from '../../defunding/states';
import { indirectDefundingReducer } from '../../indirect-defunding/reducer';
import * as helpers from '../../reducer-helpers';
import { initializeConsensusUpdate, consensusUpdateReducer } from '../../consensus-update/';
import { ConsensusUpdateAction, isConsensusUpdateAction } from '../../consensus-update/actions';
export type ReturnVal = ProtocolStateWithSharedData<states.ResponderConcludingState>;
export type Storage = SharedData;

export function responderConcludingReducer(
  protocolState: NonTerminalCState,
  sharedData: SharedData,
  action: ProtocolAction,
): ReturnVal {
  if (isConsensusUpdateAction(action)) {
    return handleLedgerUpdateAction(protocolState, sharedData, action);
  }
  if (isDefundingAction(action)) {
    return handleDefundingAction(protocolState, sharedData, action);
  } // COMMITMENT_RECEIVED is a defunding action

  if (!isConcludingResponderAction(action)) {
    return { protocolState, sharedData };
  }

  switch (action.type) {
    case 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED':
      return keepLedgerChannelApproved(protocolState, sharedData);
    case 'WALLET.CONCLUDING.RESPONDER.CONCLUDE_APPROVED':
      return concludeApproved(protocolState, sharedData);
    case 'WALLET.CONCLUDING.RESPONDER.DEFUND_CHOSEN':
      return defundChosen(protocolState, sharedData);
    case 'WALLET.CONCLUDING.RESPONDER.ACKNOWLEDGED':
      return acknowledged(protocolState, sharedData);
    case 'WALLET.CONCLUDING.RESPONDER.KEEP_OPEN_CHOSEN':
      return keepOpenChosen(protocolState, sharedData);
    default:
      return unreachable(action);
  }
}

export function initialize(
  signedCommitment: SignedCommitment,
  processId: string,
  sharedData: Storage,
): ReturnVal {
  const channelId = getChannelId(signedCommitment.commitment);
  let channelState = getChannel(sharedData, channelId);
  if (!channelState) {
    return {
      protocolState: acknowledgeFailure({
        processId,
        channelId,
        reason: 'ChannelDoesntExist',
      }),
      sharedData: showWallet(sharedData),
    };
  }

  const checkResult = checkAndStore(sharedData, signedCommitment);
  if (!checkResult.isSuccess) {
    throw new Error('Concluding responding protocol, unable to validate or store commitment');
  }
  const updatedStorage = checkResult.store;
  channelState = getChannel(updatedStorage, channelId);
  if (channelState && ourTurn(channelState)) {
    // if it's our turn now, we may resign
    return {
      protocolState: approveConcluding({ channelId, processId }),
      sharedData: showWallet(updatedStorage),
    };
  } else {
    return {
      protocolState: acknowledgeFailure({ channelId, processId, reason: 'NotYourTurn' }),
      sharedData: showWallet(sharedData),
    };
  }
}

function handleLedgerUpdateAction(
  protocolState: NonTerminalCState,
  sharedData: Storage,
  action: ConsensusUpdateAction,
): ReturnVal {
  if (protocolState.type !== 'ConcludingResponder.WaitForLedgerUpdate') {
    return { protocolState, sharedData };
  }
  const { protocolState: consensusUpdateState, sharedData: newSharedData } = consensusUpdateReducer(
    protocolState.consensusUpdateState,
    sharedData,
    action,
  );
  if (consensusUpdateState.type === 'ConsensusUpdate.Success') {
    return {
      protocolState: states.acknowledgeSuccess(protocolState),
      sharedData: newSharedData,
    };
  } else if (consensusUpdateState.type === 'ConsensusUpdate.Failure') {
    return {
      protocolState: states.acknowledgeFailure({
        ...protocolState,
        reason: 'LedgerUpdateFailed',
      }),
      sharedData: newSharedData,
    };
  } else {
    return {
      protocolState: states.waitForLedgerUpdate({
        ...protocolState,
        consensusUpdateState,
      }),
      sharedData: newSharedData,
    };
  }
}

function handleDefundingAction(
  protocolState: NonTerminalCState,
  sharedData: Storage,
  action: DefundingAction,
): ReturnVal {
  if (
    protocolState.type === 'ConcludingResponder.DecideDefund' &&
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED'
  ) {
    // TODO need stricter tests here (for now assume it is playerA's proposed ledger update)
    // setup preaction FS with sub-IDFS, call IDF reducer with this action
    const { processId } = action;
    const channel = getChannel(sharedData, protocolState.channelId);
    if (!channel) {
      throw new Error(`Channel does not exist with id ${protocolState.channelId}`);
    }
    const preActionIndirectDefundingState = waitForLedgerUpdate({
      processId,
      ledgerId: getChannelId(action.signedCommitment.commitment),
      channelId: protocolState.channelId,
      proposedAllocation: getLastCommitment(channel).allocation,
      proposedDestination: getLastCommitment(channel).destination,
    });
    const postActionIndirectDefundingState = indirectDefundingReducer(
      preActionIndirectDefundingState,
      sharedData,
      action,
    );
    const postActionDefundingState = waitForLedgerDefunding({
      processId,
      channelId: protocolState.channelId,
      indirectDefundingState: postActionIndirectDefundingState.protocolState,
    });
    const postActionConcludingState = waitForDefund({
      processId,
      channelId: protocolState.channelId,
      defundingState: postActionDefundingState,
    });
    return {
      protocolState: postActionConcludingState,
      sharedData: postActionIndirectDefundingState.sharedData,
    };
  }
  if (protocolState.type !== 'ConcludingResponder.WaitForDefund') {
    return { protocolState, sharedData };
  }
  const defundingState1 = protocolState.defundingState;

  const protocolStateWithSharedData = defundingReducer(defundingState1, sharedData, action);
  const updatedDefundingState = protocolStateWithSharedData.protocolState;
  sharedData = protocolStateWithSharedData.sharedData;
  if (isSuccess(updatedDefundingState)) {
    protocolState = acknowledgeSuccess(protocolState);
  } else if (isFailure(updatedDefundingState)) {
    protocolState = acknowledgeFailure({ ...protocolState, reason: 'DefundFailed' });
  } else {
    protocolState = { ...protocolState, defundingState: updatedDefundingState };
  }
  return { protocolState, sharedData };
}

function concludeApproved(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingResponder.ApproveConcluding') {
    return { protocolState, sharedData };
  }

  const channelState = getChannel(sharedData, protocolState.channelId);

  if (channelState) {
    const sharedDataWithOwnCommitment = createAndSendConcludeCommitment(
      sharedData,
      protocolState.processId,
      protocolState.channelId,
    );
    return {
      protocolState: decideDefund({ ...protocolState, opponentHasSelected: false }),
      sharedData: sharedDataWithOwnCommitment,
    };
  } else {
    return { protocolState, sharedData };
  }
}

function keepOpenChosen(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingResponder.DecideDefund') {
    return { protocolState, sharedData };
  }
  const ledgerId = helpers.getFundingChannelId(protocolState.channelId, sharedData);
  const appChannel = getChannel(sharedData, protocolState.channelId);
  if (!appChannel) {
    throw new Error(`Could not find channel ${protocolState.channelId}`);
  }
  sharedData = queueMessage(
    sharedData,
    sendKeepLedgerChannelApproved(theirAddress(appChannel), protocolState.processId),
  );

  if (protocolState.opponentHasSelected) {
    const latestCommitment = getLastCommitment(appChannel);
    const {
      protocolState: consensusUpdateState,
      sharedData: newSharedData,
    } = initializeConsensusUpdate(
      protocolState.processId,
      ledgerId,
      latestCommitment.allocation,
      latestCommitment.destination,
      sharedData,
    );
    return {
      protocolState: states.waitForLedgerUpdate({ ...protocolState, consensusUpdateState }),
      sharedData: newSharedData,
    };
  } else {
    return {
      protocolState: states.waitForOpponentSelection(protocolState),
      sharedData,
    };
  }
}

function defundChosen(protocolState: NonTerminalCState, sharedData: Storage): ReturnVal {
  if (protocolState.type !== 'ConcludingResponder.DecideDefund') {
    return { protocolState, sharedData };
  }
  // initialize defunding state machine

  const protocolStateWithSharedData = initializeDefunding(
    protocolState.processId,
    protocolState.channelId,
    sharedData,
  );
  const defundingState = protocolStateWithSharedData.protocolState;
  sharedData = protocolStateWithSharedData.sharedData;
  return {
    protocolState: waitForDefund({ ...protocolState, defundingState }),
    sharedData,
  };
}

function acknowledged(protocolState: CState, sharedData: Storage): ReturnVal {
  switch (protocolState.type) {
    case 'ConcludingResponder.AcknowledgeSuccess':
      return {
        protocolState: success({}),
        sharedData: sendOpponentConcluded(hideWallet(sharedData)),
      };
    case 'ConcludingResponder.AcknowledgeFailure':
      return {
        protocolState: failure({ reason: protocolState.reason }),
        sharedData: sendConcludeFailure(hideWallet(sharedData), 'Other'),
      };
    default:
      return { protocolState, sharedData };
  }
}
function keepLedgerChannelApproved(protocolState: CState, sharedData: Storage) {
  switch (protocolState.type) {
    case 'ConcludingResponder.DecideDefund':
      return {
        protocolState: { ...protocolState, opponentSelectedKeepLedgerChannel: true },
        sharedData,
      };
    case 'ConcludingResponder.WaitForOpponentSelection':
      const ledgerId = helpers.getFundingChannelId(protocolState.channelId, sharedData);
      const appChannel = getChannel(sharedData, protocolState.channelId);
      if (!appChannel) {
        throw new Error(`Could not find channel ${protocolState.channelId}`);
      }
      const latestCommitment = getLastCommitment(appChannel);
      const {
        protocolState: consensusUpdateState,
        sharedData: newSharedData,
      } = initializeConsensusUpdate(
        protocolState.processId,
        ledgerId,
        latestCommitment.allocation,
        latestCommitment.destination,
        sharedData,
      );
      return {
        protocolState: states.waitForLedgerUpdate({ ...protocolState, consensusUpdateState }),
        sharedData: newSharedData,
      };
  }
  return { protocolState, sharedData };
}

//  Helpers
const createAndSendConcludeCommitment = (
  sharedData: SharedData,
  processId: string,
  channelId: string,
): SharedData => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);

  const commitment = composeConcludeCommitment(channelState);

  const signResult = channelStoreReducer.signAndStore(sharedData.channelStore, commitment);
  if (signResult.isSuccess) {
    const sharedDataWithOwnCommitment = setChannelStore(sharedData, signResult.store);
    const messageRelay = sendCommitmentReceived(
      theirAddress(channelState),
      processId,
      signResult.signedCommitment.commitment,
      signResult.signedCommitment.signature,
    );
    return queueMessage(sharedDataWithOwnCommitment, messageRelay);
  } else {
    throw new Error(
      `Direct funding protocol, createAndSendPostFundCommitment, unable to sign commitment: ${
        signResult.reason
      }`,
    );
  }
};
