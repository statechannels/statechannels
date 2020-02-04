import {Outcome} from "@statechannels/nitro-protocol";

import {StateConstructor} from "../../utils";

import {ProtocolLocator} from "../../../communication";

import {ProtocolState} from "..";

export type NonTerminalConsensusUpdateState = NotSafeToSend | StateSent;
export type ConsensusUpdateState = NonTerminalConsensusUpdateState | Failure | Success;
export type TerminalConsensusUpdateState = Failure | Success;
export type ConsensusUpdateStateType = ConsensusUpdateState["type"];

interface Base {
  proposedOutcome: Outcome;
  channelId: string;
  processId: string;
  protocolLocator: ProtocolLocator;
}

export interface NotSafeToSend extends Base {
  type: "ConsensusUpdate.NotSafeToSend";
  clearedToSend: boolean;
}

export interface StateSent extends Base {
  type: "ConsensusUpdate.StateSent";
}

export enum FailureReason {
  Error = "Error",
  UnableToValidate = "Unable to validate",
  InvalidTurnNumReceive = "Invalid turn number received",
  ConsensusNotReached = "Consensus not reached when in StateSent",
  ProposalDoesNotMatch = "Proposal does not match expected values."
}
export interface Failure {
  type: "ConsensusUpdate.Failure";
  reason: FailureReason;
  error?: string;
}

export interface Success {
  type: "ConsensusUpdate.Success";
}

// -------
// Constructors
// -------

export const success: StateConstructor<Success> = p => {
  return {...p, type: "ConsensusUpdate.Success"};
};

export const failure: StateConstructor<Failure> = p => {
  return {...p, type: "ConsensusUpdate.Failure"};
};

export const notSafeToSend: StateConstructor<NotSafeToSend> = p => {
  return {...p, type: "ConsensusUpdate.NotSafeToSend"};
};

export const stateSent: StateConstructor<StateSent> = p => {
  return {...p, type: "ConsensusUpdate.StateSent"};
};

export function isConsensusUpdateState(state: ProtocolState): state is ConsensusUpdateState {
  return (
    state.type === "ConsensusUpdate.NotSafeToSend" ||
    state.type === "ConsensusUpdate.StateSent" ||
    isTerminal(state)
  );
}

export function isTerminal(state: ProtocolState): state is Failure | Success {
  return state.type === "ConsensusUpdate.Failure" || state.type === "ConsensusUpdate.Success";
}
