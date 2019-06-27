import { Commitment } from '../../../../domain';
import { ActionConstructor } from '../../../utils';

// -------
// Actions
// -------
export interface StrategyApproved {
  type: 'WALLET.NEW_LEDGER_FUNDING.PLAYER_A.STRATEGY_APPROVED';
  processId: string;
  channelId: string;
  consensusLibrary: string;
}

export interface AllocationChanged {
  type: 'WALLET.NEW_LEDGER_FUNDING.PLAYER_A.ALLOCATION_CHANGED';
  processId: string;
  channelId: string;
  consensusLibrary: string;
  commitment: Commitment;
}
// --------
// Constructors
// --------

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: 'WALLET.NEW_LEDGER_FUNDING.PLAYER_A.STRATEGY_APPROVED',
});

export const allocationChanged: ActionConstructor<AllocationChanged> = p => ({
  ...p,
  type: 'WALLET.NEW_LEDGER_FUNDING.PLAYER_A.ALLOCATION_CHANGED',
});

// --------
// Unions and Guards
// --------

export type Action = StrategyApproved | AllocationChanged;
