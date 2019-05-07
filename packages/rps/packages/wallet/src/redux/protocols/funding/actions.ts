import * as playerA from './player-a/actions';
import * as playerB from './player-b/actions';
import {
  isIndirectFundingAction,
  Action as IndirectFundingAction,
} from '../indirect-funding/actions';

type EmbeddedAction = IndirectFundingAction;
const isEmbeddedAction = isIndirectFundingAction;

export type FundingAction = playerA.FundingAction | playerB.FundingAction | EmbeddedAction;

export function isPlayerAFundingAction(action: FundingAction): action is playerA.FundingAction {
  return (
    action.type === playerA.CANCELLED ||
    action.type === playerA.FUNDING_SUCCESS_ACKNOWLEDGED ||
    action.type === playerA.STRATEGY_APPROVED ||
    action.type === playerA.STRATEGY_CHOSEN ||
    action.type === playerA.STRATEGY_REJECTED ||
    isEmbeddedAction(action)
  );
}
export function isPlayerBFundingAction(action: FundingAction): action is playerB.FundingAction {
  return (
    action.type === playerB.CANCELLED ||
    action.type === playerB.FUNDING_SUCCESS_ACKNOWLEDGED ||
    action.type === playerB.STRATEGY_APPROVED ||
    action.type === playerB.STRATEGY_PROPOSED ||
    action.type === playerB.STRATEGY_REJECTED ||
    isEmbeddedAction(action)
  );
}
