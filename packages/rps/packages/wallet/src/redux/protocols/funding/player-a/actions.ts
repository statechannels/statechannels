import { BaseProcessAction } from '../../actions';
import { PlayerIndex } from '../../../types';
import {
  strategyApproved,
  StrategyApproved,
  STRATEGY_APPROVED,
  FundingStrategy,
} from '../../../../communication';
export { strategyApproved, StrategyApproved, STRATEGY_APPROVED };

export type FundingAction =
  | StrategyChosen
  | StrategyApproved
  | FundingSuccessAcknowledged
  | StrategyRejected
  | Cancelled;

export const STRATEGY_CHOSEN = 'WALLET.FUNDING.STRATEGY_CHOSEN';
export const FUNDING_SUCCESS_ACKNOWLEDGED = 'WALLET.FUNDING.FUNDING_SUCCESS_ACKNOWLEDGED';
export const STRATEGY_REJECTED = 'WALLET.FUNDING.STRATEGY_REJECTED';
export const CANCELLED = 'WALLET.FUNDING.CANCELLED';
export const CANCELLED_BY_OPPONENT = 'WALLET.FUNDING.CANCELLED_BY_OPPONENT';

export interface StrategyChosen extends BaseProcessAction {
  type: typeof STRATEGY_CHOSEN;
  strategy: FundingStrategy;
}

export interface FundingSuccessAcknowledged extends BaseProcessAction {
  type: typeof FUNDING_SUCCESS_ACKNOWLEDGED;
}

export interface StrategyRejected extends BaseProcessAction {
  type: typeof STRATEGY_REJECTED;
}

export interface Cancelled extends BaseProcessAction {
  type: typeof CANCELLED;
  by: PlayerIndex;
}

// --------
// Creators
// --------

export const strategyChosen = (processId: string, strategy): StrategyChosen => ({
  type: STRATEGY_CHOSEN,
  processId,
  strategy,
});

export const fundingSuccessAcknowledged = (processId: string): FundingSuccessAcknowledged => ({
  type: FUNDING_SUCCESS_ACKNOWLEDGED,
  processId,
});

export const strategyRejected = (processId: string): StrategyRejected => ({
  type: STRATEGY_REJECTED,
  processId,
});

export const cancelled = (processId: string, by: PlayerIndex): Cancelled => ({
  type: CANCELLED,
  processId,
  by,
});
