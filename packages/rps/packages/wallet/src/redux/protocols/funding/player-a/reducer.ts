import * as states from './states';
import * as actions from './actions';

import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import {
  showWallet,
  hideWallet,
  sendFundingComplete,
  getLatestCommitment,
} from '../../reducer-helpers';
import { fundingFailure } from 'magmo-wallet-client';
import { sendStrategyProposed } from '../../../../communication';

import * as indirectFundingStates from '../../indirect-funding/states';
import { Properties } from '../../../utils';
import {
  indirectFundingReducer,
  initializeIndirectFunding,
  isIndirectFundingAction,
  IndirectFundingAction,
} from '../../indirect-funding';
import {
  isAdvanceChannelAction,
  AdvanceChannelAction,
  advanceChannelReducer,
  initializeAdvanceChannel,
  ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
} from '../../advance-channel';
import * as advanceChannelStates from '../../advance-channel/states';
import { clearedToSend } from '../../advance-channel/actions';
import { CommitmentType } from '../../../../domain';

type EmbeddedAction = IndirectFundingAction | AdvanceChannelAction;

export function initialize(
  sharedData: SharedData,
  processId: string,
  channelId: string,
  ourAddress: string,
  opponentAddress: string,
): ProtocolStateWithSharedData<states.FundingState> {
  return {
    protocolState: states.waitForStrategyChoice({
      processId,
      targetChannelId: channelId,
      opponentAddress,
      ourAddress,
    }),
    sharedData: showWallet(sharedData),
  };
}

export function fundingReducer(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingAction | EmbeddedAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (
    isAdvanceChannelAction(action) &&
    // TODO: Remove this check once protocol-locator updates have been made
    action.protocolLocator === ADVANCE_CHANNEL_PROTOCOL_LOCATOR
  ) {
    return handleAdvanceChannelAction(state, sharedData, action);
  } else if (isIndirectFundingAction(action)) {
    return handleFundingAction(state, sharedData, action);
  }

  switch (action.type) {
    case 'WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN':
      return strategyChosen(state, sharedData, action);
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return strategyApproved(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED':
      return strategyRejected(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED':
      return fundingSuccessAcknowledged(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_A.CANCELLED':
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}

function handleAdvanceChannelAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: AdvanceChannelAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (
    protocolState.type !== 'Funding.PlayerA.WaitForPostFundSetup' &&
    protocolState.type !== 'Funding.PlayerA.WaitForFunding'
  ) {
    console.warn(
      `Funding reducer received advance channel action ${action.type} but is currently in state ${
        protocolState.type
      }`,
    );
    return { protocolState, sharedData };
  }
  const result = advanceChannelReducer(protocolState.postFundSetupState, sharedData, action);
  if (!advanceChannelStates.isTerminal(result.protocolState)) {
    return {
      protocolState: { ...protocolState, postFundSetupState: result.protocolState },
      sharedData: result.sharedData,
    };
  } else if (result.protocolState.type === 'AdvanceChannel.Failure') {
    return {
      protocolState: states.failure({ reason: 'AdvanceChannelFailure' }),
      sharedData: result.sharedData,
    };
  } else {
    return {
      protocolState: states.waitForSuccessConfirmation(protocolState),
      sharedData: result.sharedData,
    };
  }
}

function handleFundingAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: IndirectFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (protocolState.type !== 'Funding.PlayerA.WaitForFunding') {
    console.warn(
      `Funding reducer received indirect funding action ${action.type} but is currently in state ${
        protocolState.type
      }`,
    );
    return { protocolState, sharedData };
  }

  const {
    protocolState: updatedFundingState,
    sharedData: updatedSharedData,
  } = indirectFundingReducer(protocolState.fundingState, sharedData, action);

  if (!indirectFundingStates.isTerminal(updatedFundingState)) {
    return {
      protocolState: states.waitForFunding({
        ...protocolState,
        fundingState: updatedFundingState,
      }),
      sharedData: updatedSharedData,
    };
  } else {
    return handleFundingComplete(protocolState, updatedFundingState, updatedSharedData);
  }
}
function strategyChosen(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyChosen,
) {
  if (state.type !== 'Funding.PlayerA.WaitForStrategyChoice') {
    return { protocolState: state, sharedData };
  }
  const { processId, opponentAddress } = state;
  const { strategy } = action;

  const message = sendStrategyProposed(opponentAddress, processId, strategy);
  return {
    protocolState: states.waitForStrategyResponse({ ...state, strategy }),
    sharedData: queueMessage(sharedData, message),
  };
}

function strategyApproved(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerA.WaitForStrategyResponse') {
    return { protocolState: state, sharedData };
  }
  const latestCommitment = getLatestCommitment(state.targetChannelId, sharedData);
  const { protocolState: fundingState, sharedData: newSharedData } = initializeIndirectFunding(
    state.processId,
    state.targetChannelId,
    latestCommitment.allocation,
    latestCommitment.destination,
    sharedData,
  );
  if (indirectFundingStates.isTerminal(fundingState)) {
    console.error('Indirect funding strate initialized to terminal state.');
    return handleFundingComplete(state, fundingState, newSharedData);
  }
  const { processId, targetChannelId } = state;
  const advanceChannelResult = initializeAdvanceChannel(
    processId,
    newSharedData,
    CommitmentType.PostFundSetup,
    {
      channelId: targetChannelId,
      ourIndex: TwoPartyPlayerIndex.A,
      processId,
      commitmentType: CommitmentType.PostFundSetup,
      clearedToSend: false,
      protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
    },
  );
  return {
    protocolState: states.waitForFunding({
      ...state,
      fundingState,
      postFundSetupState: advanceChannelResult.protocolState,
    }),
    sharedData: advanceChannelResult.sharedData,
  };
}

function strategyRejected(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerA.WaitForStrategyResponse') {
    return { protocolState: state, sharedData };
  }
  return { protocolState: states.waitForStrategyChoice(state), sharedData };
}

function fundingSuccessAcknowledged(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerA.WaitForSuccessConfirmation') {
    return { protocolState: state, sharedData };
  }
  const updatedSharedData = sendFundingComplete(sharedData, state.targetChannelId);
  return { protocolState: states.success({}), sharedData: hideWallet(updatedSharedData) };
}

function cancelled(state: states.FundingState, sharedData: SharedData, action: actions.Cancelled) {
  if (
    state.type !== 'Funding.PlayerA.WaitForStrategyChoice' &&
    state.type !== 'Funding.PlayerA.WaitForStrategyResponse'
  ) {
    return { protocolState: state, sharedData };
  }
  switch (action.by) {
    case TwoPartyPlayerIndex.A: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure({ reason: 'User refused' }),
        sharedData: queueMessage(sharedData, message),
      };
    }
    case TwoPartyPlayerIndex.B: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure({ reason: 'Opponent refused' }),
        sharedData: queueMessage(sharedData, message),
      };
    }
    default:
      return unreachable(action.by);
  }
}

function handleFundingComplete(
  protocolState: Properties<states.WaitForSuccessConfirmation>,
  fundingState: indirectFundingStates.IndirectFundingState,
  sharedData: SharedData,
) {
  if (fundingState.type === 'IndirectFunding.Success') {
    // When funding is complete we alert the advance channel protocol that we are now cleared to exchange post fund setups
    const result = advanceChannelReducer(
      protocolState.postFundSetupState,
      sharedData,
      clearedToSend({
        processId: protocolState.processId,
        protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
      }),
    );
    return {
      protocolState: states.waitForPostFundSetup({
        ...protocolState,
        postFundSetupState: result.protocolState,
      }),
      sharedData: result.sharedData,
    };
  } else {
    // TODO: Indirect funding should return a proper error to pass to our failure state
    return {
      protocolState: states.failure({ reason: 'Indirect Funding Failure' }),
      sharedData,
    };
  }
}
