import { WalletProcedure } from '../../../types';
import { Commitment } from 'fmg-core/lib/commitment';

export const STRATEGY_PROPOSED = 'WALLET.INDIRECT_FUNDING.STRATEGY_PROPOSED';
export const strategyProposed = (channelId: string) => ({
  type: STRATEGY_PROPOSED as typeof STRATEGY_PROPOSED,
  channelId,
  procedure: WalletProcedure.IndirectFunding as WalletProcedure.IndirectFunding,
});
export type StrategyProposed = ReturnType<typeof strategyProposed>;

export const ALLOCATION_CHANGE_REQUESTED = 'WALLET.INDIRECT_FUNDING.ALLOCATION_CHANGE_REQUESTED';
export const allocationChangeRequested = (channelId: string, commitment: Commitment) => ({
  type: ALLOCATION_CHANGE_REQUESTED as typeof ALLOCATION_CHANGE_REQUESTED,
  channelId,
  procedure: WalletProcedure.IndirectFunding as WalletProcedure.IndirectFunding,
  commitment,
});
export type AllocationChangeRequested = ReturnType<typeof allocationChangeRequested>;

export type Action = StrategyProposed | AllocationChangeRequested;
