import { Commitment } from 'fmg-core';

export enum PlayerIndex {
  'A' = 0,
  'B' = 1,
}

export const INITIALIZE_REQUEST = 'WALLET.INITIALIZE_REQUEST';
export const initializeRequest = userId => ({
  type: INITIALIZE_REQUEST as typeof INITIALIZE_REQUEST,
  userId,
});
export type InitializeRequest = ReturnType<typeof initializeRequest>;

// FUNDING
// =======

// TODO: after the refactor we should already have all these details. At most this request
// would need the channelId (and we don't even need that while we do one channel per wallet)
export const FUNDING_REQUEST = 'WALLET.FUNDING.REQUEST';
export const fundingRequest = (
  channelId: string,
  myAddress: string,
  opponentAddress: string,
  myBalance: string,
  opponentBalance: string,
  playerIndex: PlayerIndex,
) => ({
  type: FUNDING_REQUEST as typeof FUNDING_REQUEST,
  channelId,
  myAddress,
  opponentAddress,
  myBalance,
  opponentBalance,
  playerIndex,
});
export type FundingRequest = ReturnType<typeof fundingRequest>;

// VALIDATION
// ==========

// Called when a signed position is received from an opponent.
export const VALIDATE_COMMITMENT_REQUEST = 'WALLET.VALIDATION.REQUEST';
export const validateCommitmentRequest = (commitment: Commitment, signature: string) => ({
  type: VALIDATE_COMMITMENT_REQUEST as typeof VALIDATE_COMMITMENT_REQUEST,
  commitment,
  signature,
});
export type ValidateCommitmentRequest = ReturnType<typeof validateCommitmentRequest>;

// SIGNATURE
// =========

// Called to obtain a signature on a state before sending to an opponent.
export const SIGN_COMMITMENT_REQUEST = 'WALLET.SIGNATURE.REQUEST';
export const signCommitmentRequest = (commitment: any) => ({
  type: SIGN_COMMITMENT_REQUEST as typeof SIGN_COMMITMENT_REQUEST,
  commitment,
});
export type SignCommitmentRequest = ReturnType<typeof signCommitmentRequest>;

// WITHDRAWAL
// ==========

export const WITHDRAWAL_REQUEST = 'WALLET.WITHDRAWAL.REQUEST';
export const withdrawalRequest = (commitment: Commitment) => ({
  type: WITHDRAWAL_REQUEST as typeof WITHDRAWAL_REQUEST,
  commitment,
});
export type WithdrawalRequest = ReturnType<typeof withdrawalRequest>;

// Challenge
// =========

export const CREATE_CHALLENGE_REQUEST = 'WALLET.CHALLENGE.CREATE';
export const createChallenge = (channelId: string) => ({
  type: CREATE_CHALLENGE_REQUEST as typeof CREATE_CHALLENGE_REQUEST,
  channelId,
});
export type CreateChallengeRequest = ReturnType<typeof createChallenge>;

export const RESPOND_TO_CHALLENGE = 'WALLET.RESPOND_TO_CHALLENGE';
export const respondToChallenge = (commitment: Commitment) => ({
  commitment,
  type: RESPOND_TO_CHALLENGE as typeof RESPOND_TO_CHALLENGE,
});
export type RespondToChallenge = ReturnType<typeof respondToChallenge>;

export const CONCLUDE_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.CONCLUDE';
export const concludeChannelRequest = (channelId: string) => ({
  channelId,
  type: CONCLUDE_CHANNEL_REQUEST as typeof CONCLUDE_CHANNEL_REQUEST,
});
export type ConcludeChannelRequest = ReturnType<typeof concludeChannelRequest>;

// Wallet-to-wallet communication
// =========

// Called when a "wallet message" is received from the opponent.
// By "wallet message" we mean a message that was created directly from the opponent's
// wallet meant for wallet-to-wallet communication (e.g. communicating the address of the
// adjudicator).
export const RECEIVE_MESSAGE = 'WALLET.MESSAGING.RECEIVE_MESSAGE';
export const receiveMessage = (messagePayload: any) => ({
  type: RECEIVE_MESSAGE,
  messagePayload,
});
export type ReceiveMessage = ReturnType<typeof receiveMessage>;

// Requests
// ========
export type RequestAction =
  | ConcludeChannelRequest
  | FundingRequest
  | SignCommitmentRequest
  | ValidateCommitmentRequest
  | WithdrawalRequest
  | CreateChallengeRequest;
