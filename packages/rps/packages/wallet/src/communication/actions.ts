import { Commitment, SignedCommitment } from '../domain';
import { WalletAction } from '../redux/actions';
import { FundingStrategy } from './index';

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

// CONCLUDING
export const CONCLUDE_CHANNEL = 'WALLET.CONCLUDING.CONCLUDE_CHANNEL';
export interface ConcludeChannel extends BaseProcessAction {
  type: typeof CONCLUDE_CHANNEL;
  commitment: Commitment;
  signature: string;
}
export const concludeChannel = (
  processId: string,
  commitment: Commitment,
  signature: string,
): ConcludeChannel => ({
  type: CONCLUDE_CHANNEL,
  processId,
  commitment,
  signature,
});

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
  | ConcludeChannel
  | CommitmentReceived;

export function isRelayableAction(action: WalletAction): action is RelayableAction {
  return (
    action.type === STRATEGY_PROPOSED ||
    action.type === STRATEGY_APPROVED ||
    action.type === CONCLUDE_CHANNEL ||
    action.type === COMMITMENT_RECEIVED
  );
}
