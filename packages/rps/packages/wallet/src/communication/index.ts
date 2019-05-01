import { Commitment } from '../domain';
import { messageRelayRequested } from 'magmo-wallet-client';

export type FundingStrategy = 'IndirectFundingStrategy';

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

export type Message = StrategyProposed | StrategyApproved | ConcludeChannel;
function sendMessage(to: string, message: Message) {
  const { processId } = message;
  return messageRelayRequested(to, { processId, data: message });
}

export function sendStrategyProposed(to: string, processId: string, strategy: FundingStrategy) {
  return sendMessage(to, strategyProposed(processId, strategy));
}

export function sendStrategyApproved(to: string, processId: string) {
  return sendMessage(to, strategyApproved(processId));
}

export function sendConcludeChannel(to: string, processId, commitment, signature) {
  return sendMessage(to, concludeChannel(processId, commitment, signature));
}
