import { BaseProcessAction } from '../../actions';
import { TwoPartyPlayerIndex } from '../../../types';
import { FundingStrategy } from '../../../../communication';
import { strategyApproved, StrategyApproved } from '../../../../communication';
export { strategyApproved, StrategyApproved };
import { ActionConstructor } from '../../../utils';
import { AdvanceChannelAction } from '../../advance-channel';

// -------
// Actions
// -------

export interface StrategyChosen extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN';
  strategy: FundingStrategy;
}

export interface FundingSuccessAcknowledged extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED';
}

export interface StrategyRejected extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED';
}

export interface Cancelled extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_A.CANCELLED';
  by: TwoPartyPlayerIndex;
}

// --------
// Constructors
// --------

export const strategyChosen: ActionConstructor<StrategyChosen> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN',
});

export const fundingSuccessAcknowledged: ActionConstructor<FundingSuccessAcknowledged> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED',
});

export const strategyRejected: ActionConstructor<StrategyRejected> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED',
});

export const cancelled: ActionConstructor<Cancelled> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_A.CANCELLED',
});

// -------
// Unions and Guards
// -------

export type FundingAction =
  | StrategyChosen
  | StrategyApproved
  | FundingSuccessAcknowledged
  | StrategyRejected
  | Cancelled
  | AdvanceChannelAction;
