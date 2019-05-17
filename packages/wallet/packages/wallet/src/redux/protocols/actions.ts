import { ProtocolAction, WalletAction } from '../actions';
import { PlayerIndex, WalletProtocol } from '../types';
import { Commitment } from '../../domain';
import { ConcludeInstigated, CONCLUDE_INSTIGATED } from '../../communication';
export { BaseProcessAction } from '../../communication';

export const INITIALIZE_CHANNEL = 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL';
export const initializeChannel = () => ({
  type: INITIALIZE_CHANNEL as typeof INITIALIZE_CHANNEL,
  protocol: WalletProtocol.Application,
});
export type InitializeChannel = ReturnType<typeof initializeChannel>;

export const FUNDING_REQUESTED = 'WALLET.NEW_PROCESS.FUNDING_REQUESTED';
export const fundingRequested = (channelId: string, playerIndex: PlayerIndex) => ({
  type: FUNDING_REQUESTED as typeof FUNDING_REQUESTED,
  channelId,
  playerIndex,
  protocol: WalletProtocol.Funding,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;

export const CONCLUDE_REQUESTED = 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED';
export const concludeRequested = (channelId: string) => ({
  type: CONCLUDE_REQUESTED as typeof CONCLUDE_REQUESTED,
  channelId,
  protocol: WalletProtocol.Concluding,
});
export type ConcludeRequested = ReturnType<typeof concludeRequested>;

export const CREATE_CHALLENGE_REQUESTED = 'WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED';
export const createChallengeRequested = (channelId: string, commitment: Commitment) => ({
  type: CREATE_CHALLENGE_REQUESTED as typeof CREATE_CHALLENGE_REQUESTED,
  channelId,
  commitment,
  protocol: WalletProtocol.Dispute,
});
export type CreateChallengeRequested = ReturnType<typeof createChallengeRequested>;

export const CHALLENGE_CREATED = 'WALLET.NEW_PROCESS.CHALLENGE_CREATED';
export const challengeCreated = (commitment: Commitment, expiresAt: number, channelId: string) => ({
  type: CHALLENGE_CREATED as typeof CHALLENGE_CREATED,
  commitment,
  expiresAt,
  channelId,
  protocol: WalletProtocol.Dispute,
});
export type ChallengeCreated = ReturnType<typeof challengeCreated>;

export type NewProcessAction =
  | InitializeChannel
  | FundingRequested
  | ConcludeRequested
  | ConcludeInstigated
  | CreateChallengeRequested
  | ChallengeCreated;

export function isNewProcessAction(action: WalletAction): action is NewProcessAction {
  return (
    action.type === INITIALIZE_CHANNEL ||
    action.type === FUNDING_REQUESTED ||
    action.type === CONCLUDE_REQUESTED ||
    action.type === CONCLUDE_INSTIGATED ||
    action.type === CREATE_CHALLENGE_REQUESTED ||
    action.type === CHALLENGE_CREATED
  );
}

export function isProtocolAction(action: WalletAction): action is ProtocolAction {
  return 'processId' in action;
}
