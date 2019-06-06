import {
  ChallengeExpiredEvent,
  RefutedEvent,
  RespondWithMoveEvent,
  ChallengeExpirySetEvent,
  WalletAction,
} from '../../../actions';
import { isTransactionAction, TransactionAction } from '../../transaction-submission/actions';
import { isDefundingAction, DefundingAction } from '../../defunding/actions';
import { ActionConstructor } from '../../../utils';

// -------
// Actions
// -------

export interface ChallengeApproved {
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED';
  processId: string;
}

export interface ChallengeDenied {
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED';
  processId: string;
}

export interface ChallengeResponseAcknowledged {
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED';
  processId: string;
}

export interface ChallengeFailureAcknowledged {
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED';
  processId: string;
}

export interface DefundChosen {
  type: 'WALLET.DISPUTE.CHALLENGER.DEFUND_CHOSEN';
  processId: string;
}

export interface Acknowledged {
  type: 'WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED';
  processId: string;
}

// -------
// Constructors
// -------

export const challengeApproved: ActionConstructor<ChallengeApproved> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED',
});

export const challengeDenied: ActionConstructor<ChallengeDenied> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED',
});

export const challengeResponseAcknowledged: ActionConstructor<
  ChallengeResponseAcknowledged
> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED',
});

export const challengeFailureAcknowledged: ActionConstructor<ChallengeFailureAcknowledged> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED',
});

export const defundChosen: ActionConstructor<DefundChosen> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.DEFUND_CHOSEN',
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: 'WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED',
});

// -------
// Unions and Guards
// -------

export type ChallengerAction =
  | TransactionAction
  | DefundingAction
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

export function isChallengerAction(action: WalletAction): action is ChallengerAction {
  return (
    isTransactionAction(action) ||
    isDefundingAction(action) ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED' ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED' ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_RESPONSE_ACKNOWLEDGED' ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.CHALLENGE_FAILURE_ACKNOWLEDGED' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED' ||
    action.type === 'WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.REFUTED_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET' ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.DEFUND_CHOSEN' ||
    action.type === 'WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED'
  );
}
