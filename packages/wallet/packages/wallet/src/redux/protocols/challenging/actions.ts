export type ChallengingAction =
  | ChallengeApproved
  | ChallengeDenied
  | ChallengeResponseReceived
  | ChallengeTimedOut
  | ChallengeTimeoutAcknowledged
  | ChallengeResponseAcknowledged
  | ChallengeFailureAcknowledged;

// ------------
// Action types
// ------------
export const CHALLENGE_APPROVED = 'CHALLENGE.APPROVED';
export const CHALLENGE_DENIED = 'CHALLENGE.DENIED';
export const CHALLENGE_RESPONSE_RECEIVED = 'CHALLENGE.RESPONSE_RECEIVED';
export const CHALLENGE_TIMED_OUT = 'CHALLENGE.TIMED_OUT';
export const CHALLENGE_TIMEOUT_ACKNOWLEDGED = 'CHALLENGE.TIMEOUT_ACKNOWLEDGED';
export const CHALLENGE_RESPONSE_ACKNOWLEDGED = 'CHALLENGE.RESPONSE_ACKNOWLEDGED';
export const CHALLENGE_FAILURE_ACKNOWLEDGED = 'CHALLENGE.FAILURE_ACKNOWLEDGED';

// -------
// Actions
// -------
export interface ChallengeApproved {
  type: typeof CHALLENGE_APPROVED;
  processId: string;
}

export interface ChallengeDenied {
  type: typeof CHALLENGE_DENIED;
  processId: string;
}

export interface ChallengeResponseReceived {
  type: typeof CHALLENGE_RESPONSE_RECEIVED;
  processId: string;
}

export interface ChallengeTimedOut {
  type: typeof CHALLENGE_TIMED_OUT;
  processId: string;
}

export interface ChallengeTimeoutAcknowledged {
  type: typeof CHALLENGE_TIMEOUT_ACKNOWLEDGED;
  processId: string;
}

export interface ChallengeResponseAcknowledged {
  type: typeof CHALLENGE_RESPONSE_ACKNOWLEDGED;
  processId: string;
}

export interface ChallengeFailureAcknowledged {
  type: typeof CHALLENGE_FAILURE_ACKNOWLEDGED;
  processId: string;
}

// --------
// Creators
// --------
export const challengeApproved = (processId: string): ChallengeApproved => ({
  type: CHALLENGE_APPROVED,
  processId,
});

export const challengeDenied = (processId: string): ChallengeDenied => ({
  type: CHALLENGE_DENIED,
  processId,
});

export const challengeResponseReceived = (processId: string): ChallengeResponseReceived => ({
  type: CHALLENGE_RESPONSE_RECEIVED,
  processId,
});

export const challengeTimedOut = (processId: string): ChallengeTimedOut => ({
  type: CHALLENGE_TIMED_OUT,
  processId,
});

export const challengeTimeoutAcknowledged = (processId: string): ChallengeTimeoutAcknowledged => ({
  type: CHALLENGE_TIMEOUT_ACKNOWLEDGED,
  processId,
});

export const challengeResponseAcknowledged = (
  processId: string,
): ChallengeResponseAcknowledged => ({
  type: CHALLENGE_RESPONSE_ACKNOWLEDGED,
  processId,
});

export const challengeFailureAcknowledged = (processId: string): ChallengeFailureAcknowledged => ({
  type: CHALLENGE_FAILURE_ACKNOWLEDGED,
  processId,
});
