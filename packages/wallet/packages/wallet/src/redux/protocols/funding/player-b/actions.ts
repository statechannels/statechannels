import { BaseProcessAction } from '../../actions';
import { TwoPartyPlayerIndex } from '../../../types';
import { FundingStrategy } from '..';
import { strategyProposed, StrategyProposed } from '../../../../communication';
export { strategyProposed, StrategyProposed };
import { ActionConstructor } from '../../../utils';
import { AdvanceChannelAction } from '../../advance-channel';

// -------
// Actions
// -------

export interface StrategyApproved extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED';
  strategy: FundingStrategy;
}

export interface FundingSuccessAcknowledged extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED';
}

export interface StrategyRejected extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_B.STRATEGY_REJECTED';
}

export interface Cancelled extends BaseProcessAction {
  type: 'WALLET.FUNDING.PLAYER_B.CANCELLED';
  by: TwoPartyPlayerIndex;
}

// --------
// Constructors
// --------

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_B.STRATEGY_APPROVED',
});

export const fundingSuccessAcknowledged: ActionConstructor<FundingSuccessAcknowledged> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_B.FUNDING_SUCCESS_ACKNOWLEDGED',
});

export const strategyRejected: ActionConstructor<StrategyRejected> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_B.STRATEGY_REJECTED',
});

export const cancelled: ActionConstructor<Cancelled> = p => ({
  ...p,
  type: 'WALLET.FUNDING.PLAYER_B.CANCELLED',
});

// -------
// Unions and Guards
// -------
export type FundingAction =
  | StrategyProposed
  | StrategyApproved
  | FundingSuccessAcknowledged
  | StrategyRejected
  | Cancelled
  | AdvanceChannelAction;
