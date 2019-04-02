import { WalletProcedure } from '../../types';
import { Commitment } from 'fmg-core/lib/commitment';

export const STRATEGY_APPROVED = 'WALLET.INDIRECT_FUNDING.STRATEGY_APPROVED';
export const strategyApproved = (
  channelId: string,
  procedure: WalletProcedure.IndirectFunding,
) => ({
  type: STRATEGY_APPROVED as typeof STRATEGY_APPROVED,
  channelId,
  procedure,
});
export type StrategyApproved = ReturnType<typeof strategyApproved>;

export const ALLOCATION_CHANGED = 'WALLET.INDIRECT_FUNDING.ALLOCATION_CHANGED';
export const allocationChanged = (
  channelId: string,
  procedure: WalletProcedure.IndirectFunding,
  commitment: Commitment,
) => ({
  type: STRATEGY_APPROVED as typeof STRATEGY_APPROVED,
  channelId,
  procedure,
  commitment,
});
export type AllocationChanged = ReturnType<typeof allocationChanged>;
