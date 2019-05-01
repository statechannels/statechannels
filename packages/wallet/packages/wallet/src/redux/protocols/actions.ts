import { Commitment } from 'magmo-wallet-client/node_modules/fmg-core';
import { ProtocolAction, WalletAction } from '../actions';
import { PlayerIndex, WalletProtocol } from '../types';
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
  protocol: WalletProtocol.IndirectFunding,
});
export type FundingRequested = ReturnType<typeof fundingRequested>;

export const CONCLUDE_REQUESTED = 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED';
export const concludeRequested = (channelId: string) => ({
  type: CONCLUDE_REQUESTED as typeof CONCLUDE_REQUESTED,
  channelId,
  // TODO: Resolve inconsistent naming scheme: conclude vs closing
  protocol: WalletProtocol.Closing,
});
export type ConcludeRequested = ReturnType<typeof concludeRequested>;

export const CREATE_CHALLENGE_REQUESTED = 'WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED';
export const createChallengeRequested = (channelId: string, commitment: Commitment) => ({
  type: CREATE_CHALLENGE_REQUESTED as typeof CREATE_CHALLENGE_REQUESTED,
  channelId,
  commitment,
  protocol: WalletProtocol.Challenging,
});
export type CreateChallengeRequested = ReturnType<typeof createChallengeRequested>;

export const RESPOND_TO_CHALLENGE_REQUESTED = 'WALLET.NEW_PROCESS.RESPOND_TO_CHALLENGE_REQUESTED';
export const respondToChallengeRequested = (channelId: string, commitment: Commitment) => ({
  type: RESPOND_TO_CHALLENGE_REQUESTED as typeof RESPOND_TO_CHALLENGE_REQUESTED,
  channelId,
  commitment,
  protocol: WalletProtocol.Responding,
});
export type RespondToChallengeRequested = ReturnType<typeof respondToChallengeRequested>;

export type NewProcessAction =
  | InitializeChannel
  | FundingRequested
  | ConcludeRequested
  | CreateChallengeRequested
  | RespondToChallengeRequested;
export function isNewProcessAction(action: WalletAction): action is NewProcessAction {
  return (
    action.type === INITIALIZE_CHANNEL ||
    action.type === FUNDING_REQUESTED ||
    action.type === CONCLUDE_REQUESTED ||
    action.type === CREATE_CHALLENGE_REQUESTED ||
    action.type === RESPOND_TO_CHALLENGE_REQUESTED
  );
}

export function isProtocolAction(action: WalletAction): action is ProtocolAction {
  return 'processId' in action;
}
