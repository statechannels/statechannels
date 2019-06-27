import * as states from './states';
import * as actions from './actions';

import { NewLedgerFundingAction, isNewLedgerFundingAction } from '../../new-ledger-funding/actions';
import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import { showWallet, hideWallet, sendFundingComplete } from '../../reducer-helpers';
import { fundingFailure } from 'magmo-wallet-client';
import { sendStrategyApproved } from '../../../../communication';
import {
  newLedgerFundingReducer,
  initialize as initializeNewLedgerFunding,
} from '../../new-ledger-funding/reducer';
import * as newLedgerFundingStates from '../../new-ledger-funding/states';
import * as selectors from '../../../selectors';
import { Properties } from '../../../utils';
import {
  isExistingLedgerFundingAction,
  ExistingLedgerFundingAction,
  existingLedgerFundingReducer,
  initializeExistingLedgerFunding,
} from '../../existing-ledger-funding';
import * as existingLedgerFundingStates from '../../existing-ledger-funding/states';
import { CommitmentType } from 'fmg-core';
import { getLastCommitment } from '../../../channel-store';
type EmbeddedAction = NewLedgerFundingAction;

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
  if (isNewLedgerFundingAction(action) || isExistingLedgerFundingAction(action)) {
    return handleFundingAction(state, sharedData, action);
  }

  switch (action.type) {
    case 'WALLET.FUNDING.STRATEGY_PROPOSED':
      return strategyProposed(state, sharedData, action);
    case 'WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED':
      return strategyApproved(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_B.STRATEGY_REJECTED':
      return strategyRejected(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED':
      return fundingSuccessAcknowledged(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_B.CANCELLED':
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}

function handleFundingAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: NewLedgerFundingAction,
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
    isExistingLedgerFundingAction(action) &&
    existingLedgerFundingStates.isExistingLedgerFundingState(protocolState.fundingState)
  ) {
    return handleExistingLedgerFundingAction(protocolState, sharedData, action);
  } else {
    return handleNewLedgerFundingAction(protocolState, sharedData, action);
  }
}

function handleExistingLedgerFundingAction(
  protocolState: states.WaitForFunding,
  sharedData: SharedData,
  action: ExistingLedgerFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (!existingLedgerFundingStates.isExistingLedgerFundingState(protocolState.fundingState)) {
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
  } = existingLedgerFundingReducer(protocolState.fundingState, sharedData, action);

  if (!existingLedgerFundingStates.isTerminal(updatedFundingState)) {
    return {
      protocolState: states.waitForFunding({ ...protocolState, fundingState: updatedFundingState }),
      sharedData: updatedSharedData,
    };
  } else {
    return handleFundingComplete(protocolState, updatedFundingState, updatedSharedData);
  }
}

function handleNewLedgerFundingAction(
  protocolState: states.WaitForFunding,
  sharedData: SharedData,
  action: NewLedgerFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (!newLedgerFundingStates.isNewLedgerFundingState(protocolState.fundingState)) {
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
  } = newLedgerFundingReducer(protocolState.fundingState, sharedData, action);

  if (!newLedgerFundingStates.isTerminal(updatedFundingState)) {
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

function strategyApproved(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerB.WaitForStrategyApproval') {
    return { protocolState: state, sharedData };
  }

  const { processId, opponentAddress } = state;
  const message = sendStrategyApproved(opponentAddress, processId);

  const channelState = selectors.getChannelState(sharedData, state.targetChannelId);

  if (state.strategy === 'ExistingLedgerFundingStrategy') {
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

    const {
      protocolState: fundingState,
      sharedData: newSharedData,
    } = initializeExistingLedgerFunding(
      state.processId,
      channelState.channelId,
      existingLedgerChannel.channelId,
      sharedData,
    );

    if (existingLedgerFundingStates.isTerminal(fundingState)) {
      console.error('Indirect funding strate initialized to terminal state.');
      return handleFundingComplete(state, fundingState, newSharedData);
    }
    return {
      protocolState: states.waitForFunding({ ...state, fundingState }),
      sharedData: queueMessage(newSharedData, message),
    };
  } else {
    const { protocolState: fundingState, sharedData: newSharedData } = initializeNewLedgerFunding(
      processId,
      channelState,
      sharedData,
    );
    if (newLedgerFundingStates.isTerminal(fundingState)) {
      console.error('Indirect funding strate initialized to terminal state.');
      return handleFundingComplete(state, fundingState, newSharedData);
    }
    return {
      protocolState: states.waitForFunding({ ...state, fundingState }),
      sharedData: queueMessage(newSharedData, message),
    };
  }
}

function strategyRejected(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerB.WaitForStrategyApproval') {
    return { protocolState: state, sharedData };
  }

  return {
    protocolState: states.waitForStrategyProposal({ ...state }),
    sharedData,
  };
}

function fundingSuccessAcknowledged(state: states.FundingState, sharedData: SharedData) {
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
    | newLedgerFundingStates.NewLedgerFundingState
    | existingLedgerFundingStates.ExistingLedgerFundingState,
  sharedData: SharedData,
) {
  if (
    fundingState.type === 'NewLedgerFunding.Success' ||
    fundingState.type === 'ExistingLedgerFunding.Success'
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
