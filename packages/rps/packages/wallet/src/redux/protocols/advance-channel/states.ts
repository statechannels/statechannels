import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';

// -------
// States
// -------

export type AdvanceChannelType =
  | 'AdvanceChannel.NotSafeToSend'
  | 'AdvanceChannel.CommitmentSent'
  | 'AdvanceChannel.Success'
  | 'AdvanceChannel.Failure';

interface BaseState {
  processId: string;
  channelId: string;
  ourIndex: number;
}

export interface NotSafeToSend extends BaseState {
  type: 'AdvanceChannel.NotSafeToSend';
}

export interface CommitmentSent extends BaseState {
  type: 'AdvanceChannel.CommitmentSent';
}

export interface Success extends BaseState {
  type: 'AdvanceChannel.Success';
}

export interface Failure extends BaseState {
  type: 'AdvanceChannel.Failure';
}

// ------------
// Constructors
// ------------

const base: StateConstructor<BaseState> = params => {
  const { processId, channelId, ourIndex } = params;
  return {
    processId,
    channelId,
    ourIndex,
  };
};

export const notSafeToSend: StateConstructor<NotSafeToSend> = params => {
  return {
    ...base(params),
    type: 'AdvanceChannel.NotSafeToSend',
  };
};

export const commitmentSent: StateConstructor<CommitmentSent> = params => {
  const { transactionSubmissionState } = params;
  return {
    ...base(params),
    type: 'AdvanceChannel.CommitmentSent',
    transactionSubmissionState,
  };
};

export const success: StateConstructor<Success> = params => {
  return {
    ...base(params),
    type: 'AdvanceChannel.Success',
  };
};

export const failure: StateConstructor<Failure> = params => {
  return {
    ...base(params),
    type: 'AdvanceChannel.Failure',
  };
};

// -------
// Unions and Guards
// -------

export type NonTerminalAdvanceChannelState = NotSafeToSend | CommitmentSent;

export type AdvanceChannelState = NonTerminalAdvanceChannelState | Success | Failure;

export type AdvanceChannelStateType = AdvanceChannelState['type'];

export function isTerminal(state: AdvanceChannelState): state is Failure | Success {
  return state.type === 'AdvanceChannel.Failure' || state.type === 'AdvanceChannel.Success';
}

export function isAdvanceChannelState(state: ProtocolState): state is AdvanceChannelState {
  return (
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
