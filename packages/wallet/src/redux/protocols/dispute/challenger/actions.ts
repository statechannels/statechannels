import {
  ChallengeExpiredEvent,
  RefutedEvent,
  RespondWithMoveEvent,
  ChallengeExpirySetEvent,
  EngineAction
} from "../../../actions";
import {isTransactionAction, TransactionAction} from "../../transaction-submission/actions";
import {ActionConstructor} from "../../../utils";

// -------
// Actions
// -------

export interface ChallengeApproved {
  type: "ENGINE.DISPUTE.CHALLENGER.CHALLENGE_APPROVED";
  processId: string;
}

export interface ChallengeDenied {
  type: "ENGINE.DISPUTE.CHALLENGER.CHALLENGE_DENIED";
  processId: string;
}

export interface ExitChallenge {
  type: "ENGINE.DISPUTE.CHALLENGER.EXIT_CHALLENGE";
  processId: string;
}

export interface Acknowledged {
  type: "ENGINE.DISPUTE.CHALLENGER.ACKNOWLEDGED";
  processId: string;
}

// -------
// Constructors
// -------

export const challengeApproved: ActionConstructor<ChallengeApproved> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.CHALLENGER.CHALLENGE_APPROVED"
});

export const challengeDenied: ActionConstructor<ChallengeDenied> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.CHALLENGER.CHALLENGE_DENIED"
});

export const exitChallenge: ActionConstructor<ExitChallenge> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.CHALLENGER.EXIT_CHALLENGE"
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.CHALLENGER.ACKNOWLEDGED"
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
  | Acknowledged
  | ExitChallenge;

export function isChallengerAction(action: EngineAction): action is ChallengerAction {
  return (
    isTransactionAction(action) ||
    action.type === "ENGINE.DISPUTE.CHALLENGER.CHALLENGE_APPROVED" ||
    action.type === "ENGINE.DISPUTE.CHALLENGER.CHALLENGE_DENIED" ||
    action.type === "ENGINE.ADJUDICATOR.CHALLENGE_EXPIRED" ||
    action.type === "ENGINE.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT" ||
    action.type === "ENGINE.ADJUDICATOR.REFUTED_EVENT" ||
    action.type === "ENGINE.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET" ||
    action.type === "ENGINE.DISPUTE.CHALLENGER.ACKNOWLEDGED" ||
    action.type === "ENGINE.DISPUTE.CHALLENGER.EXIT_CHALLENGE"
  );
}
