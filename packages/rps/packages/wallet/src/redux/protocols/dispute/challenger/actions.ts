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
import { ActionConstructor } from '../../../utils';

// -------
// Actions
// -------

export interface ChallengeApproved {
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_APPROVED';
  processId: string;
}

export interface ChallengeDenied {
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_DENIED';
  processId: string;
}

export interface ChallengeResponseAcknowledged {
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED';
  processId: string;
}

export interface ChallengeFailureAcknowledged {
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED';
  processId: string;
}

export interface DefundChosen {
  type: 'WALLET.CHALLENGING.CHALLENGER.DEFUND_CHOSEN';
  processId: string;
}

export interface Acknowledged {
  type: 'WALLET.CHALLENGING.CHALLENGER.ACKNOWLEDGED';
  processId: string;
}

// -------
// Constructors
// -------

export const challengeApproved: ActionConstructor<ChallengeApproved> = p => ({
  ...p,
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_APPROVED',
});

export const challengeDenied: ActionConstructor<ChallengeDenied> = p => ({
  ...p,
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_DENIED',
});

export const challengeResponseAcknowledged: ActionConstructor<
  ChallengeResponseAcknowledged
> = p => ({
  ...p,
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED',
});

export const challengeFailureAcknowledged: ActionConstructor<ChallengeFailureAcknowledged> = p => ({
  ...p,
  type: 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED',
});

export const defundChosen: ActionConstructor<DefundChosen> = p => ({
  ...p,
  type: 'WALLET.CHALLENGING.CHALLENGER.DEFUND_CHOSEN',
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: 'WALLET.CHALLENGING.CHALLENGER.ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------

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

export function isChallengerAction(action: ProtocolAction): action is ChallengerAction {
  return (
    isTransactionAction(action) ||
    isDefundingAction(action) ||
    action.type === 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_APPROVED' ||
    action.type === 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_DENIED' ||
    action.type === 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED' ||
    action.type === 'WALLET.CHALLENGING.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED' ||
    action.type === CHALLENGE_EXPIRED_EVENT ||
    action.type === RESPOND_WITH_MOVE_EVENT ||
    action.type === REFUTED_EVENT ||
    action.type === CHALLENGE_EXPIRY_SET_EVENT ||
    action.type === 'WALLET.CHALLENGING.CHALLENGER.DEFUND_CHOSEN' ||
    action.type === 'WALLET.CHALLENGING.CHALLENGER.ACKNOWLEDGED'
  );
}
