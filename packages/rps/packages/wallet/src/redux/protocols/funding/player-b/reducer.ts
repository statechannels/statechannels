import * as states from './states';
import * as actions from './actions';

import { IndirectFundingAction, isIndirectFundingAction } from '../../indirect-funding/actions';
import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import { showWallet, hideWallet, sendFundingComplete } from '../../reducer-helpers';
import { fundingFailure } from 'magmo-wallet-client';
import { sendStrategyApproved } from '../../../../communication';
import {
  indirectFundingReducer,
  initialize as initializeIndirectFunding,
} from '../../indirect-funding/reducer';
import * as indirectFundingStates from '../../indirect-funding/states';
import * as selectors from '../../../selectors';
import { Properties } from '../../../utils';
import {
  isExistingChannelFundingAction,
  ExistingChannelFundingAction,
  existingChannelFundingReducer,
  initializeExistingChannelFunding,
} from '../../existing-channel-funding';
import * as existingChannelFundingStates from '../../existing-channel-funding/states';

import { addHex } from '../../../../utils/hex-utils';
import { CommitmentType } from 'fmg-core';
import { getLastCommitment } from '../../../channel-store';
type EmbeddedAction = IndirectFundingAction;

export function initialize(
  sharedData: SharedData,
  processId: string,
  channelId: string,
  ourAddress: string,
  opponentAddress: string,
): ProtocolStateWithSharedData<states.FundingState> {
  return {
    protocolState: states.waitForStrategyProposal({
      processId,
      targetChannelId: channelId,
      ourAddress,
      opponentAddress,
    }),
    sharedData: showWallet(sharedData),
  };
}

export function fundingReducer(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingAction | EmbeddedAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (isIndirectFundingAction(action) || isExistingChannelFundingAction(action)) {
    return handleFundingAction(state, sharedData, action);
  }

  switch (action.type) {
    case 'WALLET.FUNDING.STRATEGY_PROPOSED':
      return strategyProposed(state, sharedData, action);
    case 'WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED':
      return strategyApproved(state, sharedData, action);
    case 'WALLET.FUNDING.PLAYER_B.STRATEGY_REJECTED':
      return strategyRejected(state, sharedData, action);
    case 'WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED':
      return fundingSuccessAcknowledged(state, sharedData, action);
    case 'WALLET.FUNDING.PLAYER_B.CANCELLED':
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}

function handleFundingAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: IndirectFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (protocolState.type !== 'Funding.PlayerB.WaitForFunding') {
    console.warn(
      `Funding reducer received indirect funding action ${action.type} but is currently in state ${
        protocolState.type
      }`,
    );
    return { protocolState, sharedData };
  }

  if (
    isExistingChannelFundingAction(action) &&
    existingChannelFundingStates.isExistingChannelFundingState(protocolState.fundingState)
  ) {
    return handleExistingChannelFundingAction(protocolState, sharedData, action);
  } else {
    return handleIndirectFundingAction(protocolState, sharedData, action);
  }
}

function handleExistingChannelFundingAction(
  protocolState: states.WaitForFunding,
  sharedData: SharedData,
  action: ExistingChannelFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (!existingChannelFundingStates.isExistingChannelFundingState(protocolState.fundingState)) {
    console.warn(
      `Funding reducer received indirect funding action ${
        action.type
      } but is currently in funding state ${protocolState.fundingState.type}`,
    );
    return { protocolState, sharedData };
  }
  const {
    protocolState: updatedFundingState,
    sharedData: updatedSharedData,
  } = existingChannelFundingReducer(protocolState.fundingState, sharedData, action);

  if (!existingChannelFundingStates.isTerminal(updatedFundingState)) {
    return {
      protocolState: states.waitForFunding({ ...protocolState, fundingState: updatedFundingState }),
      sharedData: updatedSharedData,
    };
  } else {
    return handleFundingComplete(protocolState, updatedFundingState, updatedSharedData);
  }
}

function handleIndirectFundingAction(
  protocolState: states.WaitForFunding,
  sharedData: SharedData,
  action: IndirectFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (!indirectFundingStates.isIndirectFundingState(protocolState.fundingState)) {
    console.warn(
      `Funding reducer received indirect funding action ${
        action.type
      } but is currently in funding state ${protocolState.fundingState.type}`,
    );
    return { protocolState, sharedData };
  }
  const {
    protocolState: updatedFundingState,
    sharedData: updatedSharedData,
  } = indirectFundingReducer(protocolState.fundingState, sharedData, action);

  if (!indirectFundingStates.isTerminal(updatedFundingState)) {
    return {
      protocolState: states.waitForFunding({ ...protocolState, fundingState: updatedFundingState }),
      sharedData: updatedSharedData,
    };
  } else {
    return handleFundingComplete(protocolState, updatedFundingState, updatedSharedData);
  }
}

function strategyProposed(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyProposed,
) {
  if (state.type !== 'Funding.PlayerB.WaitForStrategyProposal') {
    return { protocolState: state, sharedData };
  }

  const { strategy } = action;
  return { protocolState: states.waitForStrategyApproval({ ...state, strategy }), sharedData };
}

function strategyApproved(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyApproved,
) {
  if (state.type !== 'Funding.PlayerB.WaitForStrategyApproval') {
    return { protocolState: state, sharedData };
  }

  const { processId, opponentAddress } = state;
  const message = sendStrategyApproved(opponentAddress, processId);

  const channelState = selectors.getChannelState(sharedData, state.targetChannelId);

  if (state.strategy === 'ExistingChannelStrategy') {
    const existingLedgerChannel = selectors.getExistingLedgerChannelForParticipants(
      sharedData,
      state.ourAddress,
      state.opponentAddress,
    );
    if (
      !existingLedgerChannel ||
      getLastCommitment(existingLedgerChannel).commitmentType !== CommitmentType.App
    ) {
      throw new Error(
        `Could not find open existing ledger channel with participants ${state.ourAddress} and ${
          state.opponentAddress
        }.`,
      );
    }
    const total = getLastCommitment(channelState).allocation.reduce(addHex);
    const {
      protocolState: fundingState,
      sharedData: newSharedData,
    } = initializeExistingChannelFunding(
      state.processId,
      channelState.channelId,
      existingLedgerChannel.channelId,
      total,
      sharedData,
    );

    if (existingChannelFundingStates.isTerminal(fundingState)) {
      console.error('Indirect funding strate initialized to terminal state.');
      return handleFundingComplete(state, fundingState, newSharedData);
    }
    return {
      protocolState: states.waitForFunding({ ...state, fundingState }),
      sharedData: queueMessage(newSharedData, message),
    };
  } else {
    const { protocolState: fundingState, sharedData: newSharedData } = initializeIndirectFunding(
      processId,
      channelState,
      sharedData,
    );
    if (indirectFundingStates.isTerminal(fundingState)) {
      console.error('Indirect funding strate initialized to terminal state.');
      return handleFundingComplete(state, fundingState, newSharedData);
    }
    return {
      protocolState: states.waitForFunding({ ...state, fundingState }),
      sharedData: queueMessage(newSharedData, message),
    };
  }
}

function strategyRejected(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyRejected,
) {
  if (state.type !== 'Funding.PlayerB.WaitForStrategyApproval') {
    return { protocolState: state, sharedData };
  }

  return {
    protocolState: states.waitForStrategyProposal({ ...state }),
    sharedData,
  };
}

function fundingSuccessAcknowledged(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingSuccessAcknowledged,
) {
  if (state.type !== 'Funding.PlayerB.WaitForSuccessConfirmation') {
    return { protocolState: state, sharedData };
  }
  const updatedSharedData = sendFundingComplete(sharedData, state.targetChannelId);
  return { protocolState: states.success({}), sharedData: hideWallet(updatedSharedData) };
}

function cancelled(state: states.FundingState, sharedData: SharedData, action: actions.Cancelled) {
  if (
    state.type !== 'Funding.PlayerB.WaitForStrategyProposal' &&
    state.type !== 'Funding.PlayerB.WaitForStrategyApproval'
  ) {
    return { protocolState: state, sharedData };
  }
  switch (action.by) {
    case TwoPartyPlayerIndex.A: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure({ reason: 'Opponent refused' }),
        sharedData: queueMessage(sharedData, message),
      };
    }
    case TwoPartyPlayerIndex.B: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure({ reason: 'User refused' }),
        sharedData: queueMessage(sharedData, message),
      };
    }
    default:
      return unreachable(action.by);
  }
}

function handleFundingComplete(
  protocolState: Properties<states.WaitForSuccessConfirmation>,
  fundingState:
    | indirectFundingStates.IndirectFundingState
    | existingChannelFundingStates.ExistingChannelFundingState,
  sharedData: SharedData,
) {
  if (
    fundingState.type === 'IndirectFunding.Success' ||
    fundingState.type === 'ExistingChannelFunding.Success'
  ) {
    return {
      protocolState: states.waitForSuccessConfirmation(protocolState),
      sharedData,
    };
  } else {
    // TODO: Indirect funding should return a proper error to pass to our failure state
    return {
      protocolState: states.failure({ reason: 'Indirect Funding Failure' }),
      sharedData,
    };
  }
}
