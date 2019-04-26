import { Commitment } from '../../../../domain';

export const STRATEGY_APPROVED = 'WALLET.INDIRECT_FUNDING.STRATEGY_APPROVED';
export const strategyApproved = (channelId: string, consensusLibrary: string) => ({
  type: STRATEGY_APPROVED as typeof STRATEGY_APPROVED,
  processId: channelId,
  channelId,
  consensusLibrary,
});

export type StrategyApproved = ReturnType<typeof strategyApproved>;

export const ALLOCATION_CHANGED = 'WALLET.INDIRECT_FUNDING.ALLOCATION_CHANGED';
export const allocationChanged = (channelId: string, commitment: Commitment) => ({
  type: ALLOCATION_CHANGED as typeof ALLOCATION_CHANGED,
  processId: channelId,
  channelId,
  commitment,
});
export type AllocationChanged = ReturnType<typeof allocationChanged>;

export type Action = StrategyApproved | AllocationChanged;
