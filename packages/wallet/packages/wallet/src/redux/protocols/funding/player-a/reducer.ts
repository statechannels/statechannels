import * as states from './states';
import * as actions from './actions';

import {
  Action as IndirectFundingAction,
  isIndirectFundingAction,
} from '../../indirect-funding/actions';
import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { PlayerIndex } from '../../../types';
import { showWallet } from '../../reducer-helpers';
import { fundingFailure } from 'magmo-wallet-client';
import { sendStrategyProposed } from '../../../../communication';
type EmbeddedAction = IndirectFundingAction;

export function initialize(
  sharedData: SharedData,
  processId: string,
  channelId: string,
  opponentAddress: string,
): ProtocolStateWithSharedData<states.FundingState> {
  return {
    protocolState: states.waitForStrategyChoice({
      processId,
      targetChannelId: channelId,
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
  if (isIndirectFundingAction(action)) {
    return handleIndirectFundingAction(state, sharedData);
  }

  switch (action.type) {
    case actions.STRATEGY_CHOSEN:
      return strategyChosen(state, sharedData, action);
    case actions.STRATEGY_APPROVED:
      return strategyApproved(state, sharedData, action);
    case actions.STRATEGY_REJECTED:
      return strategyRejected(state, sharedData, action);
    case actions.FUNDING_SUCCESS_ACKNOWLEDGED:
      return fundingSuccessAcknowledged(state, sharedData, action);
    case actions.CANCELLED:
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}

function handleIndirectFundingAction(
  state: states.FundingState,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.FundingState> {
  return { protocolState: state, sharedData };
}

function strategyChosen(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyChosen,
) {
  if (state.type !== states.WAIT_FOR_STRATEGY_CHOICE) {
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

function strategyApproved(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyApproved,
) {
  if (state.type !== states.WAIT_FOR_STRATEGY_RESPONSE) {
    return { protocolState: state, sharedData };
  }
  return {
    protocolState: states.waitForFunding({ ...state, fundingState: 'funding state' }),
    sharedData,
  };
}

function strategyRejected(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyRejected,
) {
  if (state.type !== states.WAIT_FOR_STRATEGY_RESPONSE) {
    return { protocolState: state, sharedData };
  }
  return { protocolState: states.waitForStrategyChoice(state), sharedData };
}

function fundingSuccessAcknowledged(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingSuccessAcknowledged,
) {
  if (state.type !== states.WAIT_FOR_SUCCESS_CONFIRMATION) {
    return { protocolState: state, sharedData };
  }
  return { protocolState: states.success(), sharedData };
}

function cancelled(state: states.FundingState, sharedData: SharedData, action: actions.Cancelled) {
  if (
    state.type !== states.WAIT_FOR_STRATEGY_CHOICE &&
    state.type !== states.WAIT_FOR_STRATEGY_RESPONSE
  ) {
    return { protocolState: state, sharedData };
  }
  switch (action.by) {
    case PlayerIndex.A: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure('User refused'),
        sharedData: queueMessage(sharedData, message),
      };
    }
    case PlayerIndex.B: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure('Opponent refused'),
        sharedData: queueMessage(sharedData, message),
      };
    }
    default:
      return unreachable(action.by);
  }
}
