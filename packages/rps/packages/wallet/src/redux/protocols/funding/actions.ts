import * as playerA from './player-a/actions';
import * as playerB from './player-b/actions';
import {
  isIndirectFundingAction,
  Action as IndirectFundingAction,
} from '../indirect-funding/actions';
// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------
type EmbeddedAction = IndirectFundingAction;
const isEmbeddedAction = isIndirectFundingAction;

export type FundingAction = playerA.FundingAction | playerB.FundingAction | EmbeddedAction;

export function isPlayerAFundingAction(action: FundingAction): action is playerA.FundingAction {
  return (
    action.type === 'WALLET.FUNDING.PLAYER_A.CANCELLED' ||
    action.type === 'WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED' ||
    action.type === 'WALLET.FUNDING.STRATEGY_APPROVED' ||
    action.type === 'WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN' ||
    action.type === 'WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED' ||
    isEmbeddedAction(action)
  );
}
export function isPlayerBFundingAction(action: FundingAction): action is playerB.FundingAction {
  return (
    action.type === 'WALLET.FUNDING.PLAYER_B.CANCELLED' ||
    action.type === 'WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED' ||
    action.type === 'WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED' ||
    action.type === 'WALLET.FUNDING.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.FUNDING.PLAYER_B.STRATEGY_REJECTED' ||
    isEmbeddedAction(action)
  );
}
