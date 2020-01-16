import {
  ChallengeExpiredEvent,
  RefutedEvent,
  RespondWithMoveEvent,
  ChallengeExpirySetEvent,
  WalletAction
} from "../../../actions";
import {isTransactionAction, TransactionAction} from "../../transaction-submission/actions";
import {ActionConstructor} from "../../../utils";

// -------
// Actions
// -------

export interface ChallengeApproved {
  type: "WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED";
  processId: string;
}

export interface ChallengeDenied {
  type: "WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED";
  processId: string;
}

export interface ExitChallenge {
  type: "WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE";
  processId: string;
}

export interface Acknowledged {
  type: "WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED";
  processId: string;
}

// -------
// Constructors
// -------

export const challengeApproved: ActionConstructor<ChallengeApproved> = p => ({
  ...p,
  type: "WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED"
});

export const challengeDenied: ActionConstructor<ChallengeDenied> = p => ({
  ...p,
  type: "WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED"
});

export const exitChallenge: ActionConstructor<ExitChallenge> = p => ({
  ...p,
  type: "WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE"
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: "WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED"
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

export function isChallengerAction(action: WalletAction): action is ChallengerAction {
  return (
    isTransactionAction(action) ||
    action.type === "WALLET.DISPUTE.CHALLENGER.CHALLENGE_APPROVED" ||
    action.type === "WALLET.DISPUTE.CHALLENGER.CHALLENGE_DENIED" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED" ||
    action.type === "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.REFUTED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT" ||
    action.type === "WALLET.DISPUTE.CHALLENGER.ACKNOWLEDGED" ||
    action.type === "WALLET.DISPUTE.CHALLENGER.EXIT_CHALLENGE"
  );
}
