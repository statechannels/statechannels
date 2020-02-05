import {State, SignedState} from "@statechannels/nitro-protocol";

import {WalletAction} from "../../actions";
import {ActionConstructor} from "../../utils";
import {DisputeAction, isDisputeAction} from "../dispute";

// -------
// Actions
// -------
export interface OwnStateReceived {
  type: "WALLET.APPLICATION.OWN_STATE_RECEIVED";
  processId: string;
  state: State;
}

export interface OpponentStateReceived {
  type: "WALLET.APPLICATION.OPPONENT_STATE_RECEIVED";
  processId: string;
  signedState: SignedState;
}

export interface ChallengeRequested {
  type: "WALLET.APPLICATION.CHALLENGE_REQUESTED";
  state: State;
  processId: string;
  channelId: string;
}

export interface ChallengeDetected {
  type: "WALLET.APPLICATION.CHALLENGE_DETECTED";
  processId: string;
  channelId: string;
  expiresAt: number;
  state: State;
}
export interface Concluded {
  type: "WALLET.APPLICATION.CONCLUDED";
  processId: string;
}

// -------
// Constructors
// -------

export const ownStateReceived: ActionConstructor<OwnStateReceived> = p => {
  return {
    ...p,
    type: "WALLET.APPLICATION.OWN_STATE_RECEIVED"
  };
};

export const opponentStateReceived: ActionConstructor<OpponentStateReceived> = p => {
  return {
    ...p,
    type: "WALLET.APPLICATION.OPPONENT_STATE_RECEIVED"
  };
};

export const challengeRequested: ActionConstructor<ChallengeRequested> = p => ({
  ...p,
  type: "WALLET.APPLICATION.CHALLENGE_REQUESTED"
});

export const challengeDetected: ActionConstructor<ChallengeDetected> = p => ({
  ...p,
  type: "WALLET.APPLICATION.CHALLENGE_DETECTED"
});

export const concluded: ActionConstructor<Concluded> = p => {
  const {processId} = p;
  return {
    type: "WALLET.APPLICATION.CONCLUDED",
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

export function isApplicationAction(action: WalletAction): action is ApplicationAction {
  return (
    isDisputeAction(action) ||
    action.type === "WALLET.APPLICATION.OPPONENT_STATE_RECEIVED" ||
    action.type === "WALLET.APPLICATION.OWN_STATE_RECEIVED" ||
    action.type === "WALLET.APPLICATION.CHALLENGE_DETECTED" ||
    action.type === "WALLET.APPLICATION.CHALLENGE_REQUESTED" ||
    action.type === "WALLET.APPLICATION.CONCLUDED"
  );
}
