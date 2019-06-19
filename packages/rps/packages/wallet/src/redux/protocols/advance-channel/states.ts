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

export const baseDirectFundingState: StateConstructor<BaseState> = params => {
  const { processId, channelId, ourIndex } = params;
  return {
    processId,
    channelId,
    ourIndex,
  };
};

export const notSafeToSend: StateConstructor<NotSafeToSend> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'AdvanceChannel.NotSafeToSend',
  };
};

export const commitmentSent: StateConstructor<CommitmentSent> = params => {
  const { transactionSubmissionState } = params;
  return {
    ...baseDirectFundingState(params),
    type: 'AdvanceChannel.CommitmentSent',
    transactionSubmissionState,
  };
};

export const success: StateConstructor<Success> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'AdvanceChannel.Success',
  };
};

export const failure: StateConstructor<Failure> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'AdvanceChannel.Failure',
  };
};

// -------
// Unions and Guards
// -------

export type NonTerminalDirectFundingState = NotSafeToSend | CommitmentSent;

export type AdvanceChannelState = NonTerminalDirectFundingState | Success | Failure;

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
