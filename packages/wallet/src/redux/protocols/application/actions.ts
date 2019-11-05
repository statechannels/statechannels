import {EngineAction} from "../../actions";
import {ActionConstructor} from "../../utils";
import {DisputeAction, isDisputeAction} from "../dispute";
import {State, SignedState} from "@statechannels/nitro-protocol";

// -------
// Actions
// -------
export interface OwnStateReceived {
  type: "ENGINE.APPLICATION.OWN_STATE_RECEIVED";
  processId: string;
  state: State;
}

export interface OpponentStateReceived {
  type: "ENGINE.APPLICATION.OPPONENT_STATE_RECEIVED";
  processId: string;
  signedState: SignedState;
}

export interface ChallengeRequested {
  type: "ENGINE.APPLICATION.CHALLENGE_REQUESTED";
  state: State;
  processId: string;
  channelId: string;
}

export interface ChallengeDetected {
  type: "ENGINE.APPLICATION.CHALLENGE_DETECTED";
  processId: string;
  channelId: string;
  expiresAt: number;
  state: State;
}
export interface Concluded {
  type: "ENGINE.APPLICATION.CONCLUDED";
  processId: string;
}

// -------
// Constructors
// -------

export const ownStateReceived: ActionConstructor<OwnStateReceived> = p => {
  return {
    ...p,
    type: "ENGINE.APPLICATION.OWN_STATE_RECEIVED"
  };
};

export const opponentStateReceived: ActionConstructor<OpponentStateReceived> = p => {
  return {
    ...p,
    type: "ENGINE.APPLICATION.OPPONENT_STATE_RECEIVED"
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
  | OpponentStateReceived
  | OwnStateReceived
  | ChallengeDetected
  | ChallengeRequested
  | Concluded
  | DisputeAction;

export function isApplicationAction(action: EngineAction): action is ApplicationAction {
  return (
    isDisputeAction(action) ||
    action.type === "ENGINE.APPLICATION.OPPONENT_STATE_RECEIVED" ||
    action.type === "ENGINE.APPLICATION.OWN_STATE_RECEIVED" ||
    action.type === "ENGINE.APPLICATION.CHALLENGE_DETECTED" ||
    action.type === "ENGINE.APPLICATION.CHALLENGE_REQUESTED" ||
    action.type === "ENGINE.APPLICATION.CONCLUDED"
  );
}
