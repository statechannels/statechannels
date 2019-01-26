// TODO: We should limit WalletEvent/WalletEventTypes to the bare minimum of events we expect the app to handle. Some of these can be pruned.
// Events that we handle for the user (HideWallet,ShowWallet, ValidateSuccess, etc..) should be removed from WalletEvent/WalletEventTypes
// We should also switch from ReturnType to declaring a fixed type/interface that the action creators implement.

// FUNDING
// =======
/**
 * The event type when funding succeeds.
 */
export const FUNDING_SUCCESS = 'WALLET.FUNDING.SUCCESS';

/**
 * The event type when funding fails.
 */
export const FUNDING_FAILURE = 'WALLET.FUNDING.FAILURE';

/**
 * @ignore
 */
export const fundingSuccess = (channelId, position: string) => ({
  type: FUNDING_SUCCESS as typeof FUNDING_SUCCESS,
  channelId,
  position,
});

/**
 * @ignore
 */
export const fundingFailure = (channelId: any, reason: 'FundingDeclined' | 'Other', error?: string) => ({
  type: FUNDING_FAILURE as typeof FUNDING_FAILURE,
  channelId,
  reason,
  error,
});

/**
 * The event that is thrown on funding success.
 */
export type FundingSuccess = ReturnType<typeof fundingSuccess>;

/**
 * The event that is thrown on funding failure.
 */
export type FundingFailure = ReturnType<typeof fundingFailure>;

/**
 * The events that will be thrown for funding.
 */
export type FundingResponse = FundingSuccess | FundingFailure;

// VALIDATION
// ==========
/**
 * @ignore
 */
export const VALIDATION_SUCCESS = 'WALLET.VALIDATION.SUCCESS';
/**
 * @ignore
 */
export const VALIDATION_FAILURE = 'WALLET.VALIDATION.FAILURE';
/**
 * @ignore
 */
export const validationSuccess = () => ({
  type: VALIDATION_SUCCESS as typeof VALIDATION_SUCCESS,
});
/**
 * @ignore
 */
export const validationFailure = (reason: "WalletBusy" | "InvalidSignature" | "Other", error?: string) => ({
  type: VALIDATION_FAILURE as typeof VALIDATION_FAILURE,
  reason,
  error,
});
/**
 * @ignore
 */
export type ValidationSuccess = ReturnType<typeof validationSuccess>;
/**
 * @ignore
 */
export type ValidationFailure = ReturnType<typeof validationFailure>;
/**
 * @ignore
 */
export type ValidationResponse = ValidationSuccess | ValidationFailure;


// SIGNATURE
// =========
/**
 * @ignore
 */
export const SIGNATURE_SUCCESS = 'WALLET.SIGNATURE.SUCCESS';
/**
 * @ignore
 */
export const SIGNATURE_FAILURE = 'WALLET.SIGNATURE.FAILURE';
/**
 * @ignore
 */
export const signatureSuccess = (signature: string) => ({
  type: SIGNATURE_SUCCESS as typeof SIGNATURE_SUCCESS,
  signature,
});
/**
 * @ignore
 */
export const signatureFailure = (reason: "WalletBusy" | "Other", error?: string) => ({
  type: SIGNATURE_FAILURE as typeof SIGNATURE_FAILURE,
  reason,
  error,
});
/**
 * @ignore
 */
export type SignatureSuccess = ReturnType<typeof signatureSuccess>;
/**
 * @ignore
 */
export type SignatureFailure = ReturnType<typeof signatureFailure>;
/**
 * @ignore
 */
export type SignatureResponse = SignatureSuccess | SignatureFailure;


// INITIALIZATION
// ==============
/**
 * @ignore
 */
export const INITIALIZATION_SUCCESS = 'WALLET.INITIALIZATION.SUCCESS';
/**
 * @ignore
 */
export const INITIALIZATION_FAILURE = 'WALLET.INITIALIZATION.FAILURE';

/**
 * @ignore
 */
export const initializationSuccess = address => ({
  type: INITIALIZATION_SUCCESS as typeof INITIALIZATION_SUCCESS,
  address,
});
/**
 * @ignore
 */
export const initializationFailure = (message: string) => ({
  type: INITIALIZATION_FAILURE as typeof INITIALIZATION_FAILURE,
  message,
});
/**
 * @ignore
 */
export type InitializationSuccess = ReturnType<typeof initializationSuccess>;

// CONCLUDE
// ==============
/**
 * The event type when the game successfully concludes.
 */
export const CONCLUDE_SUCCESS = 'WALLET.CONCLUDE.SUCCESS';
/**
 * The event type when the game conclusion fails.
 */
export const CONCLUDE_FAILURE = 'WALLET.CONCLUDE.FAILURE';
/**
 * @ignore
 */
export const concludeSuccess = () => ({
  type: CONCLUDE_SUCCESS as typeof CONCLUDE_SUCCESS,
});
/**
 * @ignore
 */
export const concludeFailure = (reason: "UserDeclined" | "Other", error?: string) => ({
  type: CONCLUDE_FAILURE as typeof CONCLUDE_FAILURE,
  reason,
  error,
});
/**
 * The event thrown when a conclude succeeds.
 */
export type ConcludeSuccess = ReturnType<typeof concludeSuccess>;
/**
 * The event thrown when a conclude fails.
 */
export type ConcludeFailure = ReturnType<typeof concludeFailure>;
/**
 * The event type when the game closes.
 */
export const CLOSE_SUCCESS = 'WALLET.CLOSE.SUCCESS';
/**
 * @ignore
 */
export const closeSuccess = () => ({
  type: CLOSE_SUCCESS as typeof CLOSE_SUCCESS,
});

/**
 * The event thrown when the game has been successfully closed.
 */
export type CloseSuccess = ReturnType<typeof closeSuccess>;


// DISPLAY
/**
 * @ignore
 */
export const SHOW_WALLET = 'WALLET.DISPLAY.SHOW_WALLET';
/**
 * @ignore
 */
export const showWallet = () => ({
  type: SHOW_WALLET as typeof SHOW_WALLET,
});
/**
 * @ignore
 */
export type ShowWallet = ReturnType<typeof showWallet>;

/**
 * @ignore
 */
export const HIDE_WALLET = 'WALLET.DISPLAY.HIDE_WALLET';
/**
 * @ignore
 */
export const hideWallet = () => ({
  type: HIDE_WALLET as typeof HIDE_WALLET,
});
/**
 * @ignore
 */
export type HideWallet = ReturnType<typeof hideWallet>;

// MESSAGING
// =========
/**
 * The type of event when a message to the opponent's wallet is requested.
 */
export const MESSAGE_REQUEST = 'WALLET.MESSAGING.MESSAGE_REQUEST';
/**
 * @ignore
 */
export const messageRequest = (to: string, data: string, signature: string) => ({
  type: MESSAGE_REQUEST as typeof MESSAGE_REQUEST,
  to,
  data,
  signature,
});

/**
 * The event thrown when the wallet requests a message be sent to the opponent's wallet.
 */
export type MessageRequest = ReturnType<typeof messageRequest>;

/**
 * The type for events where a challenge position is received from the wallet.
 */
export const CHALLENGE_POSITION_RECEIVED = 'WALLET.MESSAGING.CHALLENGE_POSITION_RECEIVED';
/**
 * @ignore
 */
export const challengePositionReceived = (positionData: string) => ({
  type: CHALLENGE_POSITION_RECEIVED as typeof CHALLENGE_POSITION_RECEIVED,
  positionData,
});
/**
 * The event thrown when the wallet has received a challenge position.
 */
export type ChallengePositionReceived = ReturnType<typeof challengePositionReceived>;

/**
 * The event type when a user rejects a challenge.
 */
export const CHALLENGE_REJECTED = 'WALLET.CHALLENGING.CHALLENGE_REJECTED';
/**
 * @ignore
 */
export const challengeRejected = (reason) => ({
  type: CHALLENGE_REJECTED as typeof CHALLENGE_REJECTED,
  reason,
});
/**
 * The event thrown when a user rejects a challenge.
 */
export type ChallengeRejected = ReturnType<typeof challengeRejected>;
/**
 * The event type when a challenge response is requested from the application.
 */
export const CHALLENGE_RESPONSE_REQUESTED = 'WALLET.CHALLENGING.CHALLENGE_RESPONSE_REQUESTED';
/**
 * @ignore
 */
export const challengeResponseRequested = () => ({
  type: CHALLENGE_RESPONSE_REQUESTED as typeof CHALLENGE_RESPONSE_REQUESTED,
});
/**
 * The event thrown when a response to a challenge is requested from the application.
 */
export type ChallengeResponseRequested = ReturnType<typeof challengeResponseRequested>;
/**
 * The event type when a challenge is over.
 */
export const CHALLENGE_COMPLETE = 'WALLET.CHALLENGING.CHALLENGE_COMPLETE';
/**
 * @ignore
 */
export const challengeComplete = () => ({
  type: CHALLENGE_COMPLETE as typeof CHALLENGE_COMPLETE,
});
/**
 * The event thrown when the challenge is over.
 */
export type ChallengeComplete = ReturnType<typeof challengeComplete>;

/**
 * The various types of wallet events that can occur.
 */
export type WalletEventType =
  typeof CHALLENGE_COMPLETE |
  typeof CHALLENGE_RESPONSE_REQUESTED |
  typeof CHALLENGE_REJECTED |
  typeof CHALLENGE_POSITION_RECEIVED |
  typeof MESSAGE_REQUEST |
  typeof CLOSE_SUCCESS |
  typeof CONCLUDE_FAILURE |
  typeof CONCLUDE_SUCCESS |
  typeof SIGNATURE_FAILURE |
  typeof SIGNATURE_SUCCESS |
  typeof VALIDATION_FAILURE |
  typeof VALIDATION_SUCCESS |
  typeof FUNDING_FAILURE |
  typeof FUNDING_SUCCESS |
  typeof CHANNEL_OPENED |
  typeof CHANNEL_OPEN_FAILURE |
  typeof CHANNEL_CLOSED;

/**
 * @ignore
 */
export type DisplayAction = ShowWallet | HideWallet;

// TODO: This could live exclusively in the wallet
export type WalletEvent =
  InitializationSuccess |
  ConcludeSuccess |
  ConcludeFailure |
  CloseSuccess |
  ValidationSuccess |
  ValidationFailure |
  FundingSuccess |
  FundingFailure |
  SignatureSuccess |
  SignatureFailure |
  ChallengePositionReceived |
  ChallengeRejected |
  ChallengeResponseRequested |
  ChallengeComplete |
  MessageRequest;