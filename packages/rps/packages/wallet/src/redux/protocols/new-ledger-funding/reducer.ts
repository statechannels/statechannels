import * as states from './states';
import { SharedData, getPrivatekey, setFundingState } from '../../state';
import { NewLedgerFundingState, failure, success } from './states';
import { ProtocolStateWithSharedData } from '..';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { CommitmentType } from '../../../domain';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../constants';
import { getChannel } from '../../channel-store';
import { DirectFundingAction } from '../direct-funding';
import { directFundingRequested } from '../direct-funding/actions';
import { isSuccess, isFailure, isTerminal } from '../direct-funding/states';
import {
  directFundingStateReducer,
  initialize as initializeDirectFunding,
} from '../direct-funding/reducer';
import { addHex } from '../../../utils/hex-utils';
import { unreachable } from '../../../utils/reducer-utils';
import { isTransactionAction } from '../../actions';
import { ChannelFundingState } from '../../state';
import { NewLedgerFundingAction } from './actions';
import {
  initializeConsensusUpdate,
  ConsensusUpdateAction,
  isConsensusUpdateAction,
  consensusUpdateReducer,
} from '../consensus-update';
import * as consensusUpdateState from '../consensus-update/states';
import * as advanceChannelState from '../advance-channel/states';
import { clearedToSend as consensusUpdateClearedToSend } from '../consensus-update/actions';
import { clearedToSend as advanceChannelClearedToSend } from '../advance-channel/actions';
import {
  initializeAdvanceChannel,
  isAdvanceChannelAction,
  advanceChannelReducer,
} from '../advance-channel';
import { getLatestCommitment, isFirstPlayer, getTwoPlayerIndex } from '../reducer-helpers';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from '../consensus-update/reducer';

type ReturnVal = ProtocolStateWithSharedData<NewLedgerFundingState>;
type IDFAction = NewLedgerFundingAction;
export const NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR = 'NewLedgerFunding';
export function initialize(
  processId: string,
  channelId: string,
  sharedData: SharedData,
): ReturnVal {
  const privateKey = getPrivatekey(sharedData, channelId);
  const ourIndex = getTwoPlayerIndex(channelId, sharedData);
  const { allocation, destination, channel } = getLatestCommitment(channelId, sharedData);
  const initializationArgs = {
    privateKey,
    channelType: CONSENSUS_LIBRARY_ADDRESS,
    ourIndex,
    commitmentType: CommitmentType.PreFundSetup,
    clearedToSend: true,
    processId,
    protocolLocator: NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR,
    participants: channel.participants,
  };

  const advanceChannelResult = initializeAdvanceChannel(
    processId,
    sharedData,
    CommitmentType.PreFundSetup,
    {
      ...initializationArgs,
      ...channelSpecificArgs(allocation, destination),
    },
  );
  sharedData = advanceChannelResult.sharedData;

  const protocolState = states.waitForPreFundSetup({
    channelId,
    processId,
    preFundSetupState: advanceChannelResult.protocolState,
  });
  return { protocolState, sharedData };
}

export function newLedgerFundingReducer(
  protocolState: states.NonTerminalNewLedgerFundingState,
  sharedData: SharedData,
  action: NewLedgerFundingAction,
): ReturnVal {
  switch (protocolState.type) {
    case 'NewLedgerFunding.WaitForPreFundSetup':
      return handleWaitForPreFundSetup(protocolState, sharedData, action);
    case 'NewLedgerFunding.WaitForDirectFunding':
      return handleWaitForDirectFunding(protocolState, sharedData, action);
    case 'NewLedgerFunding.WaitForPostFundSetup':
      return handleWaitForPostFundSetup(protocolState, sharedData, action);
    case 'NewLedgerFunding.WaitForLedgerUpdate':
      return handleWaitForLedgerUpdate(protocolState, sharedData, action);

    default:
      return unreachable(protocolState);
  }
}

function handleWaitForPostFundSetup(
  protocolState: states.WaitForPostFundSetup,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (isConsensusUpdateAction(action)) {
    const consensusUpdateResult = consensusUpdateReducer(
      protocolState.consensusUpdateState,
      sharedData,
      action,
    );
    sharedData = consensusUpdateResult.sharedData;
    return {
      protocolState: {
        ...protocolState,
        consensusUpdateState: consensusUpdateResult.protocolState,
      },
      sharedData,
    };
  } else if (
    isAdvanceChannelAction(action) &&
    // TODO: Remove this check once the protocol-locator has been properly implemented.
    action.protocolLocator === NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR
  ) {
    const advanceChannelResult = advanceChannelReducer(
      protocolState.postFundSetupState,
      sharedData,
      action,
    );
    sharedData = advanceChannelResult.sharedData;
    if (advanceChannelState.isTerminal(advanceChannelResult.protocolState)) {
      if (advanceChannelResult.protocolState.type === 'AdvanceChannel.Failure') {
        return { protocolState: failure({}), sharedData };
      } else {
        const consensusUpdateResult = consensusUpdateReducer(
          protocolState.consensusUpdateState,
          sharedData,
          consensusUpdateClearedToSend({
            processId: protocolState.processId,
            protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
          }),
        );
        sharedData = consensusUpdateResult.sharedData;
        return {
          protocolState: states.waitForLedgerUpdate({
            ...protocolState,
            consensusUpdateState: consensusUpdateResult.protocolState,
          }),
          sharedData,
        };
      }
    } else {
      return {
        protocolState: {
          ...protocolState,
          postFundSetupState: advanceChannelResult.protocolState,
        },
        sharedData,
      };
    }
  } else {
    console.warn(
      `Expected a Consensus Update action or Advance Channel action received ${
        action.type
      } instead.`,
    );
    return { protocolState, sharedData };
  }
}

function handleWaitForLedgerUpdate(
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  const unchangedState = { protocolState, sharedData };
  if (isTransactionAction(action)) {
    console.warn(
      `Ignoring transaction action ${action.type} since direct funding has been completed already.`,
    );
    return unchangedState;
  }

  if (!isConsensusUpdateAction(action)) {
    throw new Error(`Incorrect action ${action.type}`);
  }
  const consensusUpdateResult = consensusUpdateReducer(
    protocolState.consensusUpdateState,
    sharedData,
    action,
  );
  sharedData = consensusUpdateResult.sharedData;
  if (consensusUpdateState.isTerminal(consensusUpdateResult.protocolState)) {
    if (consensusUpdateResult.protocolState.type === 'ConsensusUpdate.Failure') {
      return { protocolState: failure({}), sharedData };
    } else {
      // update fundingState
      const channelFundingState: ChannelFundingState = {
        directlyFunded: false,
        fundingChannel: protocolState.ledgerId,
      };
      const ledgerFundingState: ChannelFundingState = {
        directlyFunded: true,
      };
      sharedData = setFundingState(sharedData, protocolState.channelId, channelFundingState);
      sharedData = setFundingState(sharedData, protocolState.ledgerId, ledgerFundingState);
      return { protocolState: success({}), sharedData };
    }
  } else {
    return {
      protocolState: {
        ...protocolState,
        consensusUpdateState: consensusUpdateResult.protocolState,
      },
      sharedData,
    };
  }
}

function handleWaitForPreFundSetup(
  protocolState: states.WaitForPreFundSetup,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (!isAdvanceChannelAction(action)) {
    throw new Error(`Incorrect action ${action.type}`);
  }
  const preFundResult = advanceChannelReducer(protocolState.preFundSetupState, sharedData, action);
  sharedData = preFundResult.sharedData;
  if (!advanceChannelState.isTerminal(preFundResult.protocolState)) {
    return {
      protocolState: { ...protocolState, preFundSetupState: preFundResult.protocolState },
      sharedData,
    };
  } else {
    if (preFundResult.protocolState.type === 'AdvanceChannel.Failure') {
      return { protocolState: failure({}), sharedData };
    } else {
      const ledgerId = preFundResult.protocolState.channelId;
      const latestCommitment = getLatestCommitment(ledgerId, sharedData);

      const total = latestCommitment.allocation.reduce(addHex);
      const requiredDeposit = isFirstPlayer(protocolState.channelId, sharedData)
        ? latestCommitment.allocation[0]
        : latestCommitment.allocation[1];

      const safeToDepositLevel = isFirstPlayer(protocolState.channelId, sharedData)
        ? '0x0'
        : latestCommitment.allocation[1];
      const ourIndex = getTwoPlayerIndex(protocolState.channelId, sharedData);
      // update the state
      const directFundingAction = directFundingRequested({
        processId: protocolState.processId,
        channelId: ledgerId,
        safeToDepositLevel,
        totalFundingRequired: total,
        requiredDeposit,
        ourIndex,
      });
      const directFundingState = initializeDirectFunding(directFundingAction, sharedData);
      sharedData = directFundingState.sharedData;
      const advanceChannelResult = initializeAdvanceChannel(
        protocolState.processId,
        directFundingState.sharedData,
        CommitmentType.PostFundSetup,
        {
          channelId: ledgerId,
          ourIndex,
          processId: protocolState.processId,
          commitmentType: CommitmentType.PostFundSetup,
          clearedToSend: false,
          protocolLocator: NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR,
        },
      );
      sharedData = advanceChannelResult.sharedData;
      const newProtocolState = states.waitForDirectFunding({
        ...protocolState,
        ledgerId,
        directFundingState: directFundingState.protocolState,
        postFundSetupState: advanceChannelResult.protocolState,
      });

      return { protocolState: newProtocolState, sharedData };
    }
  }
}

function handleWaitForDirectFunding(
  protocolState: states.WaitForDirectFunding,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction | ConsensusUpdateAction,
): ReturnVal {
  if (
    isAdvanceChannelAction(action) &&
    action.protocolLocator === NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR
  ) {
    const advanceChannelResult = advanceChannelReducer(
      protocolState.postFundSetupState,
      sharedData,
      action,
    );
    sharedData = advanceChannelResult.sharedData;
    return {
      protocolState: {
        ...protocolState,
        postFundSetupState: advanceChannelResult.protocolState,
      },
      sharedData,
    };
  }
  const existingDirectFundingState = protocolState.directFundingState;
  const protocolStateWithSharedData = directFundingStateReducer(
    existingDirectFundingState,
    sharedData,
    action,
  );
  const newDirectFundingState = protocolStateWithSharedData.protocolState;
  const newProtocolState = { ...protocolState, directFundingState: newDirectFundingState };
  sharedData = protocolStateWithSharedData.sharedData;

  if (!isTerminal(newDirectFundingState)) {
    return { protocolState: newProtocolState, sharedData };
  }
  if (isFailure(newDirectFundingState)) {
    return { protocolState: failure({}), sharedData };
  }
  if (isSuccess(newDirectFundingState)) {
    const channel = getChannel(sharedData.channelStore, newProtocolState.ledgerId);
    if (!channel) {
      throw new Error(`Could not find channel for id ${newProtocolState.ledgerId}`);
    }
    const { processId, ledgerId, channelId } = protocolState;
    const advanceChannelResult = advanceChannelReducer(
      protocolState.postFundSetupState,
      sharedData,
      advanceChannelClearedToSend({
        processId,
        protocolLocator: NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR,
      }),
    );

    sharedData = advanceChannelResult.sharedData;
    const latestCommitment = getLatestCommitment(ledgerId, sharedData);
    const proposedAllocation = [latestCommitment.allocation.reduce(addHex)];
    const proposedDestination = [channelId];
    const consensusUpdateResult = initializeConsensusUpdate(
      processId,
      ledgerId,
      false,
      proposedAllocation,
      proposedDestination,
      sharedData,
    );
    sharedData = consensusUpdateResult.sharedData;
    // We can skip directly to the ledger update if the post fund setup exchange is already done

    if (advanceChannelResult.protocolState.type === 'AdvanceChannel.Success') {
      return {
        protocolState: states.waitForLedgerUpdate({
          ...protocolState,
          postFundSetupState: advanceChannelResult.protocolState,
          consensusUpdateState: consensusUpdateResult.protocolState,
        }),
        sharedData,
      };
    } else if (advanceChannelResult.protocolState.type === 'AdvanceChannel.Failure') {
      return {
        protocolState: states.failure({ reason: 'AdvanceChannelFailure' }),
        sharedData,
      };
    } else {
      return {
        protocolState: states.waitForPostFundSetup({
          ...protocolState,
          postFundSetupState: advanceChannelResult.protocolState,
          consensusUpdateState: consensusUpdateResult.protocolState,
        }),
        sharedData,
      };
    }
  }

  return { protocolState, sharedData };
}

// TODO: This should be an advance channel helper
function channelSpecificArgs(
  allocation: string[],
  destination: string[],
): { allocation: string[]; destination: string[]; appAttributes: string } {
  return {
    allocation,
    destination,
    appAttributes: bytesFromAppAttributes({
      proposedAllocation: allocation,
      proposedDestination: destination,
      furtherVotesRequired: 0,
    }),
  };
}
