import {State} from "@statechannels/nitro-protocol";

// TODO: We should limit EngineEvent/EngineEventTypes to the bare minimum of events we expect the app to handle. Some of these can be pruned.
// Events that we handle for the user (HideEngine,ShowEngine, ValidateSuccess, etc..) should be removed from EngineEvent/EngineEventTypes
// We should also switch from ReturnType to declaring a fixed type/interface that the action creators implement.

// FUNDING
// =======
/**
 * The event type when funding succeeds.
 */
export const FUNDING_SUCCESS = "ENGINE.FUNDING.SUCCESS";

/**
 * The event type when funding fails.
 */
export const FUNDING_FAILURE = "ENGINE.FUNDING.FAILURE";

/**
 * @ignore
 */
export const fundingSuccess = (channelId, state: State) => ({
  type: FUNDING_SUCCESS as typeof FUNDING_SUCCESS,
  channelId,
  state
});

/**
 * @ignore
 */
export const fundingFailure = (channelId: any, reason: "FundingDeclined" | "Other", error?: string) => ({
  type: FUNDING_FAILURE as typeof FUNDING_FAILURE,
  channelId,
  reason,
  error
});

/**
 * The event that is emitted on funding success.
 */
export type FundingSuccess = ReturnType<typeof fundingSuccess>;

/**
 * The event that is emitted on funding failure.
 */
export type FundingFailure = ReturnType<typeof fundingFailure>;

/**
 * The events that will be emitted for funding.
 */
export type FundingResponse = FundingSuccess | FundingFailure;

// VALIDATION
// ==========
/**
 * @ignore
 */
export const VALIDATION_SUCCESS = "ENGINE.VALIDATION.SUCCESS";
/**
 * @ignore
 */
export const VALIDATION_FAILURE = "ENGINE.VALIDATION.FAILURE";
/**
 * @ignore
 */
export const validationSuccess = () => ({
  type: VALIDATION_SUCCESS as typeof VALIDATION_SUCCESS
});
/**
 * @ignore
 */
export const validationFailure = (reason: "EngineBusy" | "InvalidSignature" | "Other", error?: string) => ({
  type: VALIDATION_FAILURE as typeof VALIDATION_FAILURE,
  reason,
  error
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
export const SIGNATURE_SUCCESS = "ENGINE.SIGNATURE.SUCCESS";
/**
 * @ignore
 */
export const SIGNATURE_FAILURE = "ENGINE.SIGNATURE.FAILURE";
/**
 * @ignore
 */
export const signatureSuccess = (signature: string) => ({
  type: SIGNATURE_SUCCESS as typeof SIGNATURE_SUCCESS,
  signature
});
/**
 * @ignore
 */
export const signatureFailure = (reason: "EngineBusy" | "Other", error?: string) => ({
  type: SIGNATURE_FAILURE as typeof SIGNATURE_FAILURE,
  reason,
  error
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
export const INITIALIZATION_SUCCESS = "ENGINE.INITIALIZATION.SUCCESS";
/**
 * @ignore
 */
export const INITIALIZATION_FAILURE = "ENGINE.INITIALIZATION.FAILURE";

/**
 * @ignore
 */
export const initializationSuccess = (address: string) => ({
  type: INITIALIZATION_SUCCESS as typeof INITIALIZATION_SUCCESS,
  address
});
/**
 * @ignore
 */
export const initializationFailure = (message: string) => ({
  type: INITIALIZATION_FAILURE as typeof INITIALIZATION_FAILURE,
  message
});
/**
 * @ignore
 */
export type InitializationSuccess = ReturnType<typeof initializationSuccess>;

// CONCLUDE
// ==============

/**
 * The event type when the opponent concludes the game.
 */
export const OPPONENT_CONCLUDED = "ENGINE.CONCLUDE.OPPONENT";

/**
 * @ignore
 */
export const opponentConcluded = () => ({
  type: OPPONENT_CONCLUDED as typeof OPPONENT_CONCLUDED
});

/**
 * The event emitted when a conclude succeeds.
 */
export type OpponentConcluded = ReturnType<typeof opponentConcluded>;

/**
 * The event type when the game successfully concludes.
 */
export const CONCLUDE_SUCCESS = "ENGINE.CONCLUDE.SUCCESS";
/**
 * The event type when the game conclusion fails.
 */
export const CONCLUDE_FAILURE = "ENGINE.CONCLUDE.FAILURE";
/**
 * @ignore
 */
export const concludeSuccess = () => ({
  type: CONCLUDE_SUCCESS as typeof CONCLUDE_SUCCESS
});
/**
 * @ignore
 */
export const concludeFailure = (reason: "UserDeclined" | "Other", error?: string) => ({
  type: CONCLUDE_FAILURE as typeof CONCLUDE_FAILURE,
  reason,
  error
});
/**
 * The event emitted when a conclude succeeds.
 */
export type ConcludeSuccess = ReturnType<typeof concludeSuccess>;
/**
 * The event emitted when a conclude fails.
 */
export type ConcludeFailure = ReturnType<typeof concludeFailure>;

// DISPLAY
/**
 * @ignore
 */
export const SHOW_ENGINE = "ENGINE.DISPLAY.SHOW_ENGINE";
/**
 * @ignore
 */
export const showEngine = () => ({
  type: SHOW_ENGINE as typeof SHOW_ENGINE
});
/**
 * @ignore
 */
export type ShowEngine = ReturnType<typeof showEngine>;

/**
 * @ignore
 */
export const HIDE_ENGINE = "ENGINE.DISPLAY.HIDE_ENGINE";
/**
 * @ignore
 */
export const hideEngine = () => ({
  type: HIDE_ENGINE as typeof HIDE_ENGINE
});
/**
 * @ignore
 */
export type HideEngine = ReturnType<typeof hideEngine>;

// ENGINE-TO-ENGINE COMMUNICATION
// =========
/**
 * The type of event when a message relay to the opponent's engine is requested.
 */
export const MESSAGE_RELAY_REQUESTED = "ENGINE.MESSAGING.MESSAGE_RELAY_REQUESTED";
/**
 * @ignore
 */
export const messageRelayRequested = (to: string, messagePayload: any) => ({
  type: MESSAGE_RELAY_REQUESTED as typeof MESSAGE_RELAY_REQUESTED,
  to,
  messagePayload
});

/**
 * The event emitted when the engine requests a message be relayed to the opponent's engine.
 */
export type MessageRelayRequested = ReturnType<typeof messageRelayRequested>;

/**
 * The type for events where a challenge position is received from the engine.
 */
export const CHALLENGE_STATE_RECEIVED = "ENGINE.MESSAGING.CHALLENGE_STATE_RECEIVED";
/**
 * @ignore
 */
export const challengeStateReceived = (state: State) => ({
  type: CHALLENGE_STATE_RECEIVED as typeof CHALLENGE_STATE_RECEIVED,
  state
});
/**
 * The event emitted when the engine has received a challenge position.
 */
export type ChallengeStateReceived = ReturnType<typeof challengeStateReceived>;

/**
 * The event type when a user rejects a challenge.
 */
export const CHALLENGE_REJECTED = "ENGINE.CHALLENGING.CHALLENGE_REJECTED";
/**
 * @ignore
 */
export const challengeRejected = reason => ({
  type: CHALLENGE_REJECTED as typeof CHALLENGE_REJECTED,
  reason
});
/**
 * The event emitted when a user rejects a challenge.
 */
export type ChallengeRejected = ReturnType<typeof challengeRejected>;
/**
 * The event type when a challenge response is requested from the application.
 */
export const CHALLENGE_RESPONSE_REQUESTED = "ENGINE.CHALLENGING.CHALLENGE_RESPONSE_REQUESTED";
/**
 * @ignore
 */
export const challengeResponseRequested = (channelId: string) => ({
  type: CHALLENGE_RESPONSE_REQUESTED as typeof CHALLENGE_RESPONSE_REQUESTED,
  channelId
});
/**
 * The event emitted when a response to a challenge is requested from the application.
 */
export type ChallengeResponseRequested = ReturnType<typeof challengeResponseRequested>;
/**
 * The event type when a challenge is over.
 */
export const CHALLENGE_COMPLETE = "ENGINE.CHALLENGING.CHALLENGE_COMPLETE";
/**
 * @ignore
 */
export const challengeComplete = () => ({
  type: CHALLENGE_COMPLETE as typeof CHALLENGE_COMPLETE
});
/**
 * The event emitted when the challenge is over.
 */
export type ChallengeComplete = ReturnType<typeof challengeComplete>;

/**
 * The various types of engine events that can occur.
 */
export type EngineEventType =
  | typeof CHALLENGE_STATE_RECEIVED
  | typeof CHALLENGE_COMPLETE
  | typeof CHALLENGE_REJECTED
  | typeof CHALLENGE_RESPONSE_REQUESTED
  | typeof OPPONENT_CONCLUDED
  | typeof CONCLUDE_FAILURE
  | typeof CONCLUDE_SUCCESS
  | typeof FUNDING_FAILURE
  | typeof FUNDING_SUCCESS
  | typeof HIDE_ENGINE
  | typeof MESSAGE_RELAY_REQUESTED
  | typeof SHOW_ENGINE
  | typeof SIGNATURE_FAILURE
  | typeof SIGNATURE_SUCCESS
  | typeof VALIDATION_FAILURE
  | typeof VALIDATION_SUCCESS;

/**
 * @ignore
 */
export type DisplayAction = ShowEngine | HideEngine;

// TODO: This could live exclusively in the engine
export type EngineEvent =
  | ChallengeStateReceived
  | ChallengeComplete
  | ChallengeRejected
  | ChallengeResponseRequested
  | OpponentConcluded
  | ConcludeFailure
  | ConcludeSuccess
  | FundingFailure
  | FundingSuccess
  | InitializationSuccess
  | MessageRelayRequested
  | SignatureFailure
  | SignatureSuccess
  | ValidationFailure
  | ValidationSuccess;
