import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';
import { CommitmentType } from '../../../domain';
import { ProtocolLocator } from '../../../communication';

// -------
// States
// -------

export type AdvanceChannelType = AdvanceChannelState['type'];

interface BaseState {
  processId: string;
  ourIndex: number;
  commitmentType: CommitmentType;
  protocolLocator: ProtocolLocator;
}

export interface ChannelUnknown extends BaseState {
  type: 'AdvanceChannel.ChannelUnknown';
  ourIndex: number;
  allocation: string[];
  destination: string[];
  participants: string[];
  channelType: string;
  appAttributes: string;
  privateKey: string;
  clearedToSend: boolean;
  guaranteedChannel?: string;
}

export interface NotSafeToSend extends BaseState {
  type: 'AdvanceChannel.NotSafeToSend';
  channelId: string;
  clearedToSend: boolean;
}

export interface CommitmentSent extends BaseState {
  type: 'AdvanceChannel.CommitmentSent';
  channelId: string;
}

export interface Success {
  type: 'AdvanceChannel.Success';
  commitmentType: CommitmentType;
  channelId: string;
}

export interface Failure {
  type: 'AdvanceChannel.Failure';
}

// ------------
// Constructors
// ------------

const base: StateConstructor<BaseState> = params => {
  const { processId, ourIndex, commitmentType, protocolLocator } = params;
  return {
    processId,
    ourIndex,
    commitmentType,
    protocolLocator,
  };
};

export const channelUnknown: StateConstructor<ChannelUnknown> = params => {
  const {
    privateKey,
    allocation,
    destination,
    participants,
    channelType,
    appAttributes,
    clearedToSend,
  } = params;
  return {
    ...base(params),
    type: 'AdvanceChannel.ChannelUnknown',
    privateKey,
    allocation,
    destination,
    participants,
    channelType,
    appAttributes,
    clearedToSend,
  };
};

export const notSafeToSend: StateConstructor<NotSafeToSend> = params => {
  return {
    ...base(params),
    type: 'AdvanceChannel.NotSafeToSend',
    channelId: params.channelId,
    clearedToSend: params.clearedToSend,
  };
};

export const commitmentSent: StateConstructor<CommitmentSent> = params => {
  const { channelId } = params;
  return {
    ...base(params),
    type: 'AdvanceChannel.CommitmentSent',
    channelId,
  };
};

export const success: StateConstructor<Success> = params => {
  const { commitmentType, channelId } = params;
  return {
    type: 'AdvanceChannel.Success',
    commitmentType,
    channelId,
  };
};

export const failure: StateConstructor<Failure> = params => {
  return {
    type: 'AdvanceChannel.Failure',
  };
};

// -------
// Unions and Guards
// -------

export type NonTerminalAdvanceChannelState = ChannelUnknown | NotSafeToSend | CommitmentSent;

export type AdvanceChannelState = NonTerminalAdvanceChannelState | Success | Failure;

export type AdvanceChannelStateType = AdvanceChannelState['type'];

export function isTerminal(state: AdvanceChannelState): state is Failure | Success {
  return state.type === 'AdvanceChannel.Failure' || state.type === 'AdvanceChannel.Success';
}

export function isAdvanceChannelState(state: ProtocolState): state is AdvanceChannelState {
  return (
    state.type === 'AdvanceChannel.ChannelUnknown' ||
    state.type === 'AdvanceChannel.NotSafeToSend' ||
    state.type === 'AdvanceChannel.CommitmentSent' ||
    state.type === 'AdvanceChannel.Failure' ||
    state.type === 'AdvanceChannel.Success'
  );
}

export function isSuccess(state: AdvanceChannelState): state is Success {
  return state.type === 'AdvanceChannel.Success';
}

export function isFailure(state: AdvanceChannelState): state is Failure {
  return state.type === 'AdvanceChannel.Failure';
}
