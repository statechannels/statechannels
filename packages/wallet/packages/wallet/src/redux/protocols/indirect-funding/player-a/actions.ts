import { WalletProtocol } from '../../../types';
import { Commitment } from 'fmg-core/lib/commitment';

export const STRATEGY_APPROVED = 'WALLET.INDIRECT_FUNDING.STRATEGY_APPROVED';
export const strategyApproved = (channelId: string, consensusLibrary: string) => ({
  type: STRATEGY_APPROVED as typeof STRATEGY_APPROVED,
  channelId,
  consensusLibrary,
  protocol: WalletProtocol.IndirectFunding as WalletProtocol.IndirectFunding,
});

export type StrategyApproved = ReturnType<typeof strategyApproved>;

export const ALLOCATION_CHANGED = 'WALLET.INDIRECT_FUNDING.ALLOCATION_CHANGED';
export const allocationChanged = (channelId: string, commitment: Commitment) => ({
  type: ALLOCATION_CHANGED as typeof ALLOCATION_CHANGED,
  channelId,
  protocol: WalletProtocol.IndirectFunding as WalletProtocol.IndirectFunding,
  commitment,
});
export type AllocationChanged = ReturnType<typeof allocationChanged>;

export type Action = StrategyApproved | AllocationChanged;
