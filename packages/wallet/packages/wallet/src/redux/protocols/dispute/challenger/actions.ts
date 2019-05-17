import {
  ProtocolAction,
  ChallengeExpiredEvent,
  RefutedEvent,
  RespondWithMoveEvent,
  CHALLENGE_EXPIRED_EVENT,
  RESPOND_WITH_MOVE_EVENT,
  REFUTED_EVENT,
  ChallengeExpirySetEvent,
  CHALLENGE_EXPIRY_SET_EVENT,
} from '../../../actions';
import { isTransactionAction, TransactionAction } from '../../transaction-submission/actions';
import { isDefundingAction } from '../../defunding/actions';

export type ChallengerAction =
  | TransactionAction
  | ChallengeApproved
  | ChallengeDenied
  | RefutedEvent
  | RespondWithMoveEvent
  | ChallengeExpiredEvent
  | ChallengeExpirySetEvent
  | ChallengeResponseAcknowledged
  | ChallengeFailureAcknowledged
  | DefundChosen
  | Acknowledged;

// ------------
// Action types
// ------------
export const CHALLENGE_APPROVED = 'CHALLENGE.APPROVED';
export const CHALLENGE_DENIED = 'CHALLENGE.DENIED';
export const CHALLENGE_TIMEOUT_ACKNOWLEDGED = 'CHALLENGE.TIMEOUT_ACKNOWLEDGED';
export const CHALLENGE_RESPONSE_ACKNOWLEDGED = 'CHALLENGE.RESPONSE_ACKNOWLEDGED';
export const CHALLENGE_FAILURE_ACKNOWLEDGED = 'CHALLENGE.FAILURE_ACKNOWLEDGED';
export const DEFUND_CHOSEN = 'CHALLENGE.DEFUND_CHOSEN';
export const ACKNOWLEDGED = 'CHALLENGE.ACKNOWLEDGED';
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

export interface ChallengeResponseAcknowledged {
  type: typeof CHALLENGE_RESPONSE_ACKNOWLEDGED;
  processId: string;
}

export interface ChallengeFailureAcknowledged {
  type: typeof CHALLENGE_FAILURE_ACKNOWLEDGED;
  processId: string;
}

export interface DefundChosen {
  type: typeof DEFUND_CHOSEN;
  processId: string;
}

export interface Acknowledged {
  type: typeof ACKNOWLEDGED;
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

export const defundChosen = (processId: string): DefundChosen => ({
  type: DEFUND_CHOSEN,
  processId,
});

export const acknowledged = (processId: string): Acknowledged => ({
  type: ACKNOWLEDGED,
  processId,
});

export function isChallengerAction(action: ProtocolAction): action is ChallengerAction {
  return (
    isTransactionAction(action) ||
    isDefundingAction(action) ||
    action.type === CHALLENGE_APPROVED ||
    action.type === CHALLENGE_DENIED ||
    action.type === CHALLENGE_RESPONSE_ACKNOWLEDGED ||
    action.type === CHALLENGE_FAILURE_ACKNOWLEDGED ||
    action.type === CHALLENGE_EXPIRED_EVENT ||
    action.type === RESPOND_WITH_MOVE_EVENT ||
    action.type === REFUTED_EVENT ||
    action.type === CHALLENGE_EXPIRY_SET_EVENT ||
    action.type === DEFUND_CHOSEN ||
    action.type === ACKNOWLEDGED
  );
}
