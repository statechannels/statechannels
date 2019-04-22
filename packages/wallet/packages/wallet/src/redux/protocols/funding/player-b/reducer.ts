import * as states from './states';
import * as actions from './actions';

import {
  Action as IndirectFundingAction,
  isIndirectFundingAction,
} from '../../indirect-funding/actions';
import { SharedData } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';

type EmbeddedAction = IndirectFundingAction;

export function fundingReducer(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingAction | EmbeddedAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (isIndirectFundingAction(action)) {
    return handleIndirectFundingAction(state, sharedData);
  }

  switch (action.type) {
    case actions.STRATEGY_PROPOSED:
      return strategyProposed(state, sharedData, action);
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

function strategyProposed(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyProposed,
) {
  return { protocolState: state, sharedData };
}

function strategyApproved(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyApproved,
) {
  return { protocolState: state, sharedData };
}

function strategyRejected(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyRejected,
) {
  return { protocolState: state, sharedData };
}

function fundingSuccessAcknowledged(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingSuccessAcknowledged,
) {
  return { protocolState: state, sharedData };
}

function cancelled(state: states.FundingState, sharedData: SharedData, action: actions.Cancelled) {
  return { protocolState: state, sharedData };
}
