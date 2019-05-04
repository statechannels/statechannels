import { Commitment } from '../domain';
import { messageRelayRequested } from 'magmo-wallet-client';
import {
  RelayableAction,
  strategyProposed,
  strategyApproved,
  concludeChannel,
  commitmentReceived,
} from './actions';
export * from './actions';

export type FundingStrategy = 'IndirectFundingStrategy';

function sendMessage(to: string, message: RelayableAction) {
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

export const sendCommitmentReceived = (
  to: string,
  processId: string,
  commitment: Commitment,
  signature: string,
) => {
  const payload = {
    processId,
    data: commitmentReceived(processId, { commitment, signature }),
  };
  return messageRelayRequested(to, payload);
};
