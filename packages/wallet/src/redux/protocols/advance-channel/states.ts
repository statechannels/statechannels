import {Outcome} from "@statechannels/nitro-protocol";

import {StateConstructor} from "../../utils";

import {ProtocolLocator} from "../../../communication";

import {ProtocolState} from "..";

// -------
// States
// -------
export enum StateType {
  PreFundSetup = 0,
  PostFundSetup = 1,
  App = 2,
  Conclude = 3
}
export type AdvanceChannelType = AdvanceChannelState["type"];

interface BaseState {
  processId: string;
  ourIndex: number;
  stateType: StateType;
  protocolLocator: ProtocolLocator;
}

export interface ChannelUnknown extends BaseState {
  type: "AdvanceChannel.ChannelUnknown";
  ourIndex: number;
  outcome: Outcome;
  participants: string[];
  appDefinition: string;
  appData: string;
  privateKey: string;
  clearedToSend: boolean;
}

export interface NotSafeToSend extends BaseState {
  type: "AdvanceChannel.NotSafeToSend";
  channelId: string;
  clearedToSend: boolean;
}

export interface StateSent extends BaseState {
  type: "AdvanceChannel.StateSent";
  channelId: string;
}

export interface Success {
  type: "AdvanceChannel.Success";
  stateType: StateType;
  channelId: string;
}

export interface Failure {
  type: "AdvanceChannel.Failure";
}

// ------------
// Constructors
// ------------

const base: StateConstructor<BaseState> = params => {
  const {processId, ourIndex, stateType, protocolLocator} = params;
  return {
    processId,
    ourIndex,
    stateType,
    protocolLocator
  };
};

export const channelUnknown: StateConstructor<ChannelUnknown> = params => {
  const {
    privateKey,
    outcome,
    participants,
    appDefinition: channelType,
    appData: appAttributes,
    clearedToSend
  } = params;
  return {
    ...base(params),
    type: "AdvanceChannel.ChannelUnknown",
    privateKey,
    outcome,
    participants,
    appDefinition: channelType,
    appData: appAttributes,
    clearedToSend
  };
};

export const notSafeToSend: StateConstructor<NotSafeToSend> = params => {
  return {
    ...base(params),
    type: "AdvanceChannel.NotSafeToSend",
    channelId: params.channelId,
    clearedToSend: params.clearedToSend
  };
};

export const stateSent: StateConstructor<StateSent> = params => {
  const {channelId} = params;
  return {
    ...base(params),
    type: "AdvanceChannel.StateSent",
    channelId
  };
};

export const success: StateConstructor<Success> = params => {
  const {stateType, channelId} = params;
  return {
    type: "AdvanceChannel.Success",
    stateType,
    channelId
  };
};

export const failure: StateConstructor<Failure> = params => {
  return {
    type: "AdvanceChannel.Failure"
  };
};

// -------
// Unions and Guards
// -------

export type NonTerminalAdvanceChannelState = ChannelUnknown | NotSafeToSend | StateSent;

export type AdvanceChannelState = NonTerminalAdvanceChannelState | Success | Failure;

export type AdvanceChannelStateType = AdvanceChannelState["type"];

export function isTerminal(state: AdvanceChannelState): state is Failure | Success {
  return state.type === "AdvanceChannel.Failure" || state.type === "AdvanceChannel.Success";
}

export function isAdvanceChannelState(state: ProtocolState): state is AdvanceChannelState {
  return (
    state.type === "AdvanceChannel.ChannelUnknown" ||
    state.type === "AdvanceChannel.NotSafeToSend" ||
    state.type === "AdvanceChannel.StateSent" ||
    state.type === "AdvanceChannel.Failure" ||
    state.type === "AdvanceChannel.Success"
  );
}

export function isSuccess(state: AdvanceChannelState): state is Success {
  return state.type === "AdvanceChannel.Success";
}

export function isFailure(state: AdvanceChannelState): state is Failure {
  return state.type === "AdvanceChannel.Failure";
}
