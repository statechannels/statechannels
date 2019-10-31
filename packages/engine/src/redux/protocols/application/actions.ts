import {Commitment} from "../../../domain";
import {EngineAction} from "../../actions";
import {ActionConstructor} from "../../utils";
import {DisputeAction, isDisputeAction} from "../dispute";

// -------
// Actions
// -------
export interface OwnCommitmentReceived {
  type: "ENGINE.APPLICATION.OWN_COMMITMENT_RECEIVED";
  processId: string;
  commitment: Commitment;
}

export interface OpponentCommitmentReceived {
  type: "ENGINE.APPLICATION.OPPONENT_COMMITMENT_RECEIVED";
  processId: string;
  commitment: Commitment;
  signature: string;
}

export interface ChallengeRequested {
  type: "ENGINE.APPLICATION.CHALLENGE_REQUESTED";
  commitment: Commitment;
  processId: string;
  channelId: string;
}

export interface ChallengeDetected {
  type: "ENGINE.APPLICATION.CHALLENGE_DETECTED";
  processId: string;
  channelId: string;
  expiresAt: number;
  commitment: Commitment;
}
export interface Concluded {
  type: "ENGINE.APPLICATION.CONCLUDED";
  processId: string;
}

// -------
// Constructors
// -------

export const ownCommitmentReceived: ActionConstructor<OwnCommitmentReceived> = p => {
  const {processId, commitment} = p;
  return {
    type: "ENGINE.APPLICATION.OWN_COMMITMENT_RECEIVED",
    processId,
    commitment
  };
};

export const opponentCommitmentReceived: ActionConstructor<OpponentCommitmentReceived> = p => {
  const {processId, commitment, signature} = p;
  return {
    type: "ENGINE.APPLICATION.OPPONENT_COMMITMENT_RECEIVED",
    processId,
    commitment,
    signature
  };
};

export const challengeRequested: ActionConstructor<ChallengeRequested> = p => ({
  ...p,
  type: "ENGINE.APPLICATION.CHALLENGE_REQUESTED"
});

export const challengeDetected: ActionConstructor<ChallengeDetected> = p => ({
  ...p,
  type: "ENGINE.APPLICATION.CHALLENGE_DETECTED"
});

export const concluded: ActionConstructor<Concluded> = p => {
  const {processId} = p;
  return {
    type: "ENGINE.APPLICATION.CONCLUDED",
    processId
  };
};

// -------
// Unions and Guards
// -------

export type ApplicationAction =
  | OpponentCommitmentReceived
  | OwnCommitmentReceived
  | ChallengeDetected
  | ChallengeRequested
  | Concluded
  | DisputeAction;

export function isApplicationAction(action: EngineAction): action is ApplicationAction {
  return (
    isDisputeAction(action) ||
    action.type === "ENGINE.APPLICATION.OPPONENT_COMMITMENT_RECEIVED" ||
    action.type === "ENGINE.APPLICATION.OWN_COMMITMENT_RECEIVED" ||
    action.type === "ENGINE.APPLICATION.CHALLENGE_DETECTED" ||
    action.type === "ENGINE.APPLICATION.CHALLENGE_REQUESTED" ||
    action.type === "ENGINE.APPLICATION.CONCLUDED"
  );
}
