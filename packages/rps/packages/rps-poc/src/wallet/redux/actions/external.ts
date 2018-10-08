import {
  WaitForFunding as WaitForFundingA,
  Concluded as ConcludedA,
} from '../../../game-engine/application-states/PlayerA';
import {
  WaitForFunding as WaitForFundingB,
  Concluded as ConcludedB,
} from '../../../game-engine/application-states/PlayerB';
import  { SignableData } from '../../domain/ChannelWallet';
import { Channel } from 'fmg-core';

// FUNDING
// =======

export const FUNDING_REQUEST = 'WALLET.FUNDING.REQUEST';
export const FUNDING_SUCCESS = 'WALLET.FUNDING.SUCCESS';
export const FUNDING_FAILURE = 'WALLET.FUNDING.FAILURE';

export const fundingRequest = (
  channelId: string,
  state: WaitForFundingA | WaitForFundingB
) => ({
  type: FUNDING_REQUEST as typeof FUNDING_REQUEST,
  channelId,
  state,
});
export const fundingSuccess = channelId => ({
  type: FUNDING_SUCCESS as typeof FUNDING_SUCCESS,
  channelId,
});
export const fundingFailure = (channelId, reason) => ({
  type: FUNDING_FAILURE as typeof FUNDING_FAILURE,
  channelId,
  reason,
});

export type FundingRequest = ReturnType<typeof fundingRequest>;
export type FundingSuccess = ReturnType<typeof fundingSuccess>;
export type FundingFailure = ReturnType<typeof fundingFailure>;
export type FundingResponse = FundingSuccess | FundingFailure;

// CHANNELS
// ========

export const OPEN_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.OPEN';
export const CLOSE_CHANNEL_REQUEST = 'WALLET.CHANNEL.REQUEST.CLOSE';
export const CHANNEL_OPENED = 'WALLET.CHANNEL.OPENED';
export const CHANNEL_CLOSED = 'WALLET.CHANNEL.CLOSED';

export const openChannelRequest = (channel: Channel) => ({
  type: OPEN_CHANNEL_REQUEST as typeof OPEN_CHANNEL_REQUEST,
  channel,
});
export const channelOpened = (channelId: string) => ({
  type: CHANNEL_OPENED as typeof CHANNEL_OPENED,
  channelId,
});
export const closeChannelRequest = () => ({
  type: CLOSE_CHANNEL_REQUEST as typeof CLOSE_CHANNEL_REQUEST,
});
export const channelClosed = (walletId: string) => ({
  type: CHANNEL_CLOSED as typeof CHANNEL_CLOSED,
  walletId,
});

export type OpenChannelRequest = ReturnType<typeof openChannelRequest>;
export type ChannelOpened = ReturnType<typeof channelOpened>;
export type CloseChannelRequest = ReturnType<typeof closeChannelRequest>;
export type ChannelClosed = ReturnType<typeof channelClosed>;

// VALIDATION
// ==========

export const VALIDATION_REQUEST = 'WALLET.VALIDATION.REQUEST';
export const VALIDATION_SUCCESS = 'WALLET.VALIDATION.SUCCESS';
export const VALIDATION_FAILURE = 'WALLET.VALIDATION.FAILURE';

export const validationRequest = (requestId: string, data: SignableData, signature: string, opponentIndex: number) => ({
  type: VALIDATION_REQUEST as typeof VALIDATION_REQUEST,
  requestId,
  data,
  signature,
  opponentIndex,
});
export const validationSuccess = (requestId: string) => ({
  type: VALIDATION_SUCCESS as typeof VALIDATION_SUCCESS,
  requestId,
});
export const validationFailure = (requestId: string, reason: string) => ({
  type: VALIDATION_FAILURE as typeof VALIDATION_FAILURE,
  requestId,
  reason,
});

export type ValidationRequest = ReturnType<typeof validationRequest>;
export type ValidationSuccess = ReturnType<typeof validationSuccess>;
export type ValidationFailure = ReturnType<typeof validationFailure>;
export type ValidationResponse = ValidationSuccess | ValidationFailure;

// SIGNATURE
// =========

export const SIGNATURE_REQUEST = 'WALLET.SIGNATURE.REQUEST';
export const SIGNATURE_SUCCESS = 'WALLET.SIGNATURE.SUCCESS';
export const SIGNATURE_FAILURE = 'WALLET.SIGNATURE.FAILURE';

export const signatureRequest = (requestId: string, data: SignableData) => ({
  type: SIGNATURE_REQUEST as typeof SIGNATURE_REQUEST,
  requestId,
  data,
});
export const signatureSuccess = (requestId: string, signature: string) => ({
  type: SIGNATURE_SUCCESS as typeof SIGNATURE_SUCCESS,
  requestId,
  signature,
});
export const signatureFailure = (requestId: string, reason: string) => ({
  type: SIGNATURE_FAILURE as typeof SIGNATURE_FAILURE,
  requestId,
  reason,
});

export type SignatureRequest = ReturnType<typeof signatureRequest>;
export type SignatureSuccess = ReturnType<typeof signatureSuccess>;
export type SignatureFailure = ReturnType<typeof signatureFailure>;
export type SignatureResponse = SignatureSuccess | SignatureFailure;

// WITHDRAWAL
// ==========

export const WITHDRAWAL_REQUEST = 'WALLET.WITHDRAWAL.REQUEST';
export const WITHDRAWAL_SUCCESS = 'WALLET.WITHDRAWAL.SUCCESS';
export const WITHDRAWAL_FAILURE = 'WALLET.WITHDRAWAL.FAILURE';

export const withdrawalRequest = (state: ConcludedA | ConcludedB) => ({
  type: WITHDRAWAL_REQUEST as typeof WITHDRAWAL_REQUEST,
  state,
});
export const withdrawalSuccess = transaction => ({
  type: WITHDRAWAL_SUCCESS as typeof WITHDRAWAL_SUCCESS,
  transaction,
});
export const withdrawalFailure = (reason) => ({
  type: WITHDRAWAL_FAILURE as typeof WITHDRAWAL_FAILURE,
  reason,
});

export type WithdrawalRequest = ReturnType<typeof withdrawalRequest>;
export type WithdrawalSuccess = ReturnType<typeof withdrawalSuccess>;
export type WithdrawalFailure = ReturnType<typeof withdrawalFailure>;
export type WithdrawalResponse = FundingSuccess | FundingFailure;


// INITIALIZATION
// ==============

export const INITIALIZATION_SUCCESS = 'WALLET.INITIALIZATION.SUCCESS';
export const INITIALIZATION_FAILURE = 'WALLET.INITIALIZATION.FAILURE';

export const initializationSuccess = address => ({
  type: INITIALIZATION_SUCCESS as typeof INITIALIZATION_SUCCESS,
  address,
});

export const initializationFailure = (message: string) => ({
  type: INITIALIZATION_FAILURE as typeof INITIALIZATION_FAILURE,
  message,
});

export type InitializationSuccess = ReturnType<typeof initializationSuccess>;

// MESSAGING
// =========
export const SEND_MESSAGE = 'WALLET.MESSAGING.SEND';
export const RECEIVE_MESSAGE = 'WALLET.MESSAGING.RECEIVE';
export const STORE_MESSAGE_REQUEST = 'WALLET.MESSAGING.REQUEST.STORE';


export const sendMessage = (to: string, data: string) => ({
  type: SEND_MESSAGE as typeof SEND_MESSAGE,
  to,
  data,
});

export const receiveMessage = (data: string) => ({
  type: RECEIVE_MESSAGE,
  data,
});

export const storeMessageRequest = (positionData: string, signature: string, direction: "sent" | "received") => ({
  type: STORE_MESSAGE_REQUEST as typeof STORE_MESSAGE_REQUEST,
  positionData,
  signature,
  direction,
});

export type SendMessage = ReturnType<typeof sendMessage>;
export type ReceiveMessage = ReturnType<typeof receiveMessage>;
export type StoreMessageRequest = ReturnType<typeof storeMessageRequest>;

// DECODING
// ========

// Requests
// ========
export type RequestAction = OpenChannelRequest | CloseChannelRequest | FundingRequest | SignatureRequest | ValidationRequest | WithdrawalRequest | StoreMessageRequest;
