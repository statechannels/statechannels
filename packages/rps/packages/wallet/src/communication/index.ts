import { Commitment, SignedCommitment } from '../domain';
import { messageRelayRequested } from 'magmo-wallet-client';
import { RelayableAction, strategyProposed, strategyApproved, commitmentReceived } from './actions';
import { concludeInstigated } from '../redux/protocols/actions';
export * from './actions';

export type FundingStrategy = 'IndirectFundingStrategy';

function sendMessage(to: string, message: RelayableAction) {
  return messageRelayRequested(to, message);
}

export function sendStrategyProposed(to: string, processId: string, strategy: FundingStrategy) {
  return sendMessage(to, strategyProposed(processId, strategy));
}

export function sendStrategyApproved(to: string, processId: string) {
  return sendMessage(to, strategyApproved(processId));
}

export function sendConcludeInstigated(to: string, channelId, signedCommitment: SignedCommitment) {
  return sendMessage(to, concludeInstigated(signedCommitment, channelId));
}

export const sendCommitmentReceived = (
  to: string,
  processId: string,
  commitment: Commitment,
  signature: string,
) => {
  const payload = commitmentReceived(processId, { commitment, signature });
  return messageRelayRequested(to, payload);
};
