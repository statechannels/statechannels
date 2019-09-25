import * as playerA from './player-a/actions';
import * as playerB from './player-b/actions';
import { WalletAction } from '../../../redux/actions';
import { routerFactory, EmbeddedProtocol } from '../../../communication';

// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------

export type FundingStrategyNegotiationAction =
  | playerA.FundingStrategyNegotiationAction
  | playerB.FundingStrategyNegotiationAction;

export function isPlayerAFundingStrategyNegotiationAction(
  action: WalletAction,
): action is playerA.FundingStrategyNegotiationAction {
  return (
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.CANCELLED' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_CHOSEN' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_REJECTED'
  );
}
export function isPlayerBFundingStrategyNegotiationAction(
  action: WalletAction,
): action is playerB.FundingStrategyNegotiationAction {
  return (
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_B.CANCELLED' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_B.STRATEGY_APPROVED' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_B.STRATEGY_REJECTED'
  );
}

export function isFundingStrategyNegotiationAction(
  action: WalletAction,
): action is FundingStrategyNegotiationAction {
  return (
    isPlayerAFundingStrategyNegotiationAction(action) ||
    isPlayerBFundingStrategyNegotiationAction(action)
  );
}

export const routesToFundingStrategyNegotiation = routerFactory(
  isFundingStrategyNegotiationAction,
  EmbeddedProtocol.FundingStrategyNegotiation,
);
