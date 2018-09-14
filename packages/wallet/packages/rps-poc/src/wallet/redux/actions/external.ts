import {
  WaitForFunding as WaitForFundingA, 
  Concluded as ConcludedA, 
} from '../../../game-engine/application-states/PlayerA';
import {
  WaitForFunding as WaitForFundingB, 
  Concluded as ConcludedB, 
} from '../../../game-engine/application-states/PlayerB';

// FUNDING
// =======

export const FUNDING_REQUEST = 'WALLET.FUNDING.REQUEST';
export const FUNDING_SUCCESS = 'WALLET.FUNDING.SUCCESS';
export const FUNDING_FAILURE = 'WALLET.FUNDING.FAILURE';

export const fundingRequest = (channelId, state: WaitForFundingA | WaitForFundingB) => ({
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

// VALIDATION
// ==========

export const VALIDATION_REQUEST = 'WALLET.VALIDATION.REQUEST';
export const VALIDATION_SUCCESS = 'WALLET.VALIDATION.SUCCESS';
export const VALIDATION_FAILURE = 'WALLET.VALIDATION.FAILURE';

export const validationRequest = (requestId: string, signedPositionData: string) => ({
  type: VALIDATION_REQUEST as typeof VALIDATION_REQUEST,
  requestId,
  signedPositionData,
});
export const validationSuccess = (requestId: string, positionData: string) => ({
  type: VALIDATION_SUCCESS as typeof VALIDATION_SUCCESS,
  requestId,
  positionData,
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

export const signatureRequest = (requestId: string, positionData: string) => ({
  type: SIGNATURE_REQUEST as typeof SIGNATURE_REQUEST,
  requestId,
  positionData,
});
export const signatureSuccess = (requestId: string, moveData: string) => ({
  type: SIGNATURE_SUCCESS as typeof SIGNATURE_SUCCESS,
  requestId,
  moveData,
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
export const withdrawalSuccess = channelId => ({
  type: WITHDRAWAL_SUCCESS as typeof WITHDRAWAL_SUCCESS,
  channelId,
});
export const withdrawalFailure = (channelId, reason) => ({
  type: WITHDRAWAL_FAILURE as typeof WITHDRAWAL_FAILURE,
  channelId,
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

// Requests
// ========

export type RequestAction = FundingRequest | SignatureRequest | ValidationRequest | WithdrawalRequest;

// MESSAGING
// =========
export const SEND_MESSAGE = 'WALLET.MESSAGING.SEND';
export const RECEIVE_MESSAGE = 'WALLET.MESSAGING.RECEIVE';

export const sendMessage = (to: string, data: string) => ({
  type: SEND_MESSAGE as typeof SEND_MESSAGE,
  to,
  data,
});

export const receiveMessage = (data: string) => ({
  type: RECEIVE_MESSAGE,
  data,
});

export type SendMessage = ReturnType<typeof sendMessage>;
export type ReceiveMessage = ReturnType<typeof receiveMessage>;
