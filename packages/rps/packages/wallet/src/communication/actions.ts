import { SignedCommitment } from '../domain';
import { WalletAction } from '../redux/actions';
import { FundingStrategy } from './index';
import { WalletProtocol } from '.';

export interface BaseProcessAction {
  processId: string;
  type: string;
}

// FUNDING
export const STRATEGY_PROPOSED = 'WALLET.FUNDING.STRATEGY_PROPOSED';
export interface StrategyProposed extends BaseProcessAction {
  type: typeof STRATEGY_PROPOSED;
  strategy: FundingStrategy;
}
export const strategyProposed = (
  processId: string,
  strategy: FundingStrategy,
): StrategyProposed => ({
  type: STRATEGY_PROPOSED,
  processId,
  strategy,
});

export const STRATEGY_APPROVED = 'WALLET.FUNDING.STRATEGY_APPROVED';
export interface StrategyApproved extends BaseProcessAction {
  type: typeof STRATEGY_APPROVED;
}
export const strategyApproved = (processId: string): StrategyApproved => ({
  type: STRATEGY_APPROVED,
  processId,
});

export const CONCLUDE_INSTIGATED = 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED';
export const concludeInstigated = (signedCommitment: SignedCommitment, channelId: string) => ({
  type: CONCLUDE_INSTIGATED as typeof CONCLUDE_INSTIGATED,
  signedCommitment,
  protocol: WalletProtocol.Concluding,
  channelId,
});
export type ConcludeInstigated = ReturnType<typeof concludeInstigated>;

// COMMON
export const COMMITMENT_RECEIVED = 'WALLET.COMMON.COMMITMENT_RECEIVED';
export const commitmentReceived = (processId: string, signedCommitment: SignedCommitment) => ({
  type: COMMITMENT_RECEIVED as typeof COMMITMENT_RECEIVED,
  processId,
  signedCommitment,
});
export type CommitmentReceived = ReturnType<typeof commitmentReceived>;

export type RelayableAction =
  | StrategyProposed
  | StrategyApproved
  | ConcludeInstigated
  | CommitmentReceived;

export function isRelayableAction(action: WalletAction): action is RelayableAction {
  return (
    action.type === STRATEGY_PROPOSED ||
    action.type === STRATEGY_APPROVED ||
    action.type === CONCLUDE_INSTIGATED ||
    action.type === COMMITMENT_RECEIVED
  );
}
