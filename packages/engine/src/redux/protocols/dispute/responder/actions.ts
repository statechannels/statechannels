import {BaseProcessAction} from "../../actions";
import {TransactionAction} from "../../transaction-submission/actions";
import {isTransactionAction, ChallengeExpiredEvent, ChallengeExpirySetEvent, EngineAction} from "../../../actions";
import {ActionConstructor} from "../../../utils";
import {State} from "@statechannels/nitro-protocol";

// -------
// Actions
// -------

export interface RespondApproved extends BaseProcessAction {
  type: "ENGINE.DISPUTE.RESPONDER.RESPOND_APPROVED";
  processId: string;
}

export interface ResponseProvided extends BaseProcessAction {
  type: "ENGINE.DISPUTE.RESPONDER.RESPONSE_PROVIDED";
  processId: string;
  state: State;
}

export interface ExitChallenge {
  type: "ENGINE.DISPUTE.CHALLENGER.EXIT_CHALLENGE";
  processId: string;
}
export interface Acknowledged extends BaseProcessAction {
  type: "ENGINE.DISPUTE.RESPONDER.ACKNOWLEDGED";
  processId: string;
}

// --------
// Constructors
// --------

export const respondApproved: ActionConstructor<RespondApproved> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.RESPONDER.RESPOND_APPROVED"
});

export const responseProvided: ActionConstructor<ResponseProvided> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.RESPONDER.RESPONSE_PROVIDED"
});

export const exitChallenge: ActionConstructor<ExitChallenge> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.CHALLENGER.EXIT_CHALLENGE"
});

export const acknowledged: ActionConstructor<Acknowledged> = p => ({
  ...p,
  type: "ENGINE.DISPUTE.RESPONDER.ACKNOWLEDGED"
});

// -------
// Unions and Guards
// -------

export type ResponderAction =
  | TransactionAction
  | RespondApproved
  | ResponseProvided
  | ChallengeExpiredEvent
  | ChallengeExpirySetEvent
  | Acknowledged
  | ExitChallenge;

export function isResponderAction(action: EngineAction): action is ResponderAction {
  return (
    isTransactionAction(action) ||
    action.type === "ENGINE.DISPUTE.RESPONDER.RESPOND_APPROVED" ||
    action.type === "ENGINE.DISPUTE.RESPONDER.RESPONSE_PROVIDED" ||
    action.type === "ENGINE.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET" ||
    action.type === "ENGINE.ADJUDICATOR.CHALLENGE_EXPIRED" ||
    action.type === "ENGINE.DISPUTE.RESPONDER.ACKNOWLEDGED" ||
    action.type === "ENGINE.DISPUTE.CHALLENGER.EXIT_CHALLENGE"
  );
}
