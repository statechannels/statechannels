import { State, Channel } from 'fmg-core';
import { SignableData } from '../domain/ChannelWallet';
import BN from 'bn.js';
import { PlayerIndex } from '../wallet-engine/wallet-states';

// FUNDING
// =======

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

export const OPEN_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.OPEN';
export const CLOSE_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.CLOSE';

export const openChannelRequest = (channel: Channel) => ({
  type: OPEN_CHANNEL_REQUEST as typeof OPEN_CHANNEL_REQUEST,
  channel,
});

export const closeChannelRequest = () => ({
  type: CLOSE_CHANNEL_REQUEST as typeof CLOSE_CHANNEL_REQUEST,
});

export type OpenChannelRequest = ReturnType<typeof openChannelRequest>;
export type CloseChannelRequest = ReturnType<typeof closeChannelRequest>;


// VALIDATION
// ==========

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
export const CHALLENGE_RESPONSE_REQUEST = 'WALLET.CHALLENGE.RESPONSE';

export const createChallenge = () => ({
  type: CREATE_CHALLENGE_REQUEST as typeof CREATE_CHALLENGE_REQUEST,
});

export const challengeResponseRequest = (positionData: string) => ({
  type: CHALLENGE_RESPONSE_REQUEST as typeof CHALLENGE_RESPONSE_REQUEST,
  positionData,
});

export type CreateChallengeRequest = ReturnType<typeof createChallenge>;
export type ChallengeResponseRequest = ReturnType<typeof challengeResponseRequest>;


// MESSAGING
// =========
export const RECEIVE_MESSAGE = 'WALLET.MESSAGING.RECEIVE';

export const receiveMessage = (data: string) => ({
  type: RECEIVE_MESSAGE,
  data,
});

export type ReceiveMessage = ReturnType<typeof receiveMessage>;

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
  ChallengeResponseRequest;
