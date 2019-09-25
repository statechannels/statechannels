import { BaseProcessAction } from '../../actions';
import { TwoPartyPlayerIndex } from '../../../types';
import { FundingStrategy } from '../../../../communication';
import { strategyApproved, StrategyApproved } from '../../../../communication';
export { strategyApproved, StrategyApproved };
import { ActionConstructor } from '../../../utils';

// -------
// Actions
// -------

export interface StrategyChosen extends BaseProcessAction {
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_CHOSEN';
  strategy: FundingStrategy;
}

export interface StrategyRejected extends BaseProcessAction {
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_REJECTED';
}

export interface Cancelled extends BaseProcessAction {
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.CANCELLED';
  by: TwoPartyPlayerIndex;
}

// --------
// Constructors
// --------

export const strategyChosen: ActionConstructor<StrategyChosen> = p => ({
  ...p,
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_CHOSEN',
});

export const strategyRejected: ActionConstructor<StrategyRejected> = p => ({
  ...p,
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_REJECTED',
});

export const cancelled: ActionConstructor<Cancelled> = p => ({
  ...p,
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.CANCELLED',
});

// -------
// Unions and Guards
// -------

export type FundingStrategyNegotiationAction =
  | StrategyChosen
  | StrategyApproved
  | StrategyRejected
  | Cancelled;
