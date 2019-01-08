import { State, Channel } from 'fmg-core';
import { SignableData } from '../domain/ChannelWallet';
import BN from 'bn.js';

export enum PlayerIndex {
  'A' = 0,
  'B' = 1,
}
// FUNDING
// =======

// TODO: after the refactor we should already have all these details. At most this request
// would need the channelId (and we don't even need that while we do one channel per wallet)
export const FUNDING_REQUEST = 'WALLET.FUNDING.REQUEST';
export const fundingRequest = (
  channelId: string,
  myAddress: string,
  opponentAddress: string,
  myBalance: BN,
  opponentBalance: BN,
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


// CHANNELS
// ========

// Currently triggered in the app's messaging-service, immediately before funding is requested
// Responsible for loading channel and kicking off the monitoring sagas.
// TODO: remove - we shouldn't need this after the wallet refactor
export const OPEN_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.OPEN';
export const openChannelRequest = (channel: Channel) => ({
  type: OPEN_CHANNEL_REQUEST as typeof OPEN_CHANNEL_REQUEST,
  channel,
});
export type OpenChannelRequest = ReturnType<typeof openChannelRequest>;

export const CONCLUDE_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.CONCLUDE';
export const concludeChannelRequest = () => ({
  type: CONCLUDE_CHANNEL_REQUEST as typeof CONCLUDE_CHANNEL_REQUEST,
});
export type ConcludeChannelRequest = ReturnType<typeof concludeChannelRequest>;

// Currently called by the app's messaging-service, after withdrawal is requested.
// Responsible for shutting down the sagas that openChannelRequest started.
// TODO: remove - don't need after the refactor
export const CLOSE_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.CLOSE';
export const closeChannelRequest = () => ({
  type: CLOSE_CHANNEL_REQUEST as typeof CLOSE_CHANNEL_REQUEST,
});
export type CloseChannelRequest = ReturnType<typeof closeChannelRequest>;


// VALIDATION
// ==========

// Called when a signed position is received from an opponent.
export const VALIDATION_REQUEST = 'WALLET.VALIDATION.REQUEST';
export const validationRequest = (requestId: string, data: SignableData, signature: string) => ({
  type: VALIDATION_REQUEST as typeof VALIDATION_REQUEST,
  requestId,
  data,
  signature,
});
export type ValidationRequest = ReturnType<typeof validationRequest>;


// SIGNATURE
// =========

// Called to obtain a signature on a state before sending to an opponent.
export const SIGNATURE_REQUEST = 'WALLET.SIGNATURE.REQUEST';
export const signatureRequest = (requestId: string, data: SignableData) => ({
  type: SIGNATURE_REQUEST as typeof SIGNATURE_REQUEST,
  requestId,
  data,
});
export type SignatureRequest = ReturnType<typeof signatureRequest>;

// WITHDRAWAL
// ==========

export const WITHDRAWAL_REQUEST = 'WALLET.WITHDRAWAL.REQUEST';
export const withdrawalRequest = (position: State) => ({
  type: WITHDRAWAL_REQUEST as typeof WITHDRAWAL_REQUEST,
  position,
});
export type WithdrawalRequest = ReturnType<typeof withdrawalRequest>;


// Challenge
// =========

export const CREATE_CHALLENGE_REQUEST = 'WALLET.CHALLENGE.CREATE';
export const createChallenge = () => ({
  type: CREATE_CHALLENGE_REQUEST as typeof CREATE_CHALLENGE_REQUEST,
});
export type CreateChallengeRequest = ReturnType<typeof createChallenge>;

export const RESPOND_TO_CHALLENGE = 'RESPOND_TO_CHALLENGE';
export const respondToChallenge = (position: string) => ({
  position,
  type: RESPOND_TO_CHALLENGE as typeof RESPOND_TO_CHALLENGE,
});
export type RespondToChallenge = ReturnType<typeof respondToChallenge>;


// MESSAGING
// =========

// Called when a "wallet message" is received from the opponent.
// By "wallet message" we mean a message that was created directly from the opponent's
// wallet meant for wallet-to-wallet communication (e.g. communicating the address of the
// adjudicator).
export const RECEIVE_MESSAGE = 'WALLET.MESSAGING.RECEIVE';
export const receiveMessage = (data: string, signature?: string) => ({
  type: RECEIVE_MESSAGE,
  data,
  signature,
});
export type ReceiveMessage = ReturnType<typeof receiveMessage>;

// Called by the app's messaging-service when any message is sent to the opponent.
// We use this to update the channel's state - which we only do after the the state is actually sent.
// TODO: we probably don't need this after the refactor. The wallet should probably store
// and update at the signing stage. Otherwise, poor app design (or app crashing) could lead
// to a state being sent to the opponent that the wallet no longer has, which would be bad.
export const MESSAGE_SENT = 'WALLET.MESSAGING.MESSAGE_SENT';
export const messageSent = (positionData: string, signature: string) => ({
  type: MESSAGE_SENT as typeof MESSAGE_SENT,
  positionData,
  signature,
});
export type MessageSent = ReturnType<typeof messageSent>;

// Requests
// ========
export type RequestAction =
  OpenChannelRequest |
  CloseChannelRequest |
  FundingRequest |
  SignatureRequest |
  ValidationRequest |
  WithdrawalRequest |
  CreateChallengeRequest |
  ConcludeChannelRequest;
