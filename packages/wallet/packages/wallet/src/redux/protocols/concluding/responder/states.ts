import { Constructor } from '../../../utils';
import { DefundingState } from '../../defunding';
export type ConcludingState = NonTerminalState | PreTerminalState | TerminalState;
export type ConcludingStateType = ConcludingState['type'];

export type NonTerminalState =
  | ApproveConcluding
  | DecideDefund
  | WaitForDefund
  | AcknowledgeFailure
  | AcknowledgeSuccess;

export type PreTerminalState = AcknowledgeSuccess | AcknowledgeFailure;

export type TerminalState = Success | Failure;

export type FailureReason = 'NotYourTurn' | 'ChannelDoesntExist' | 'DefundFailed';

export interface AcknowledgeSuccess {
  type: 'AcknowledgeSuccess';
  processId: string;
  channelId: string;
}
export interface AcknowledgeFailure {
  type: 'AcknowledgeFailure';
  reason: FailureReason;
  processId: string;
  channelId: string;
}
export interface ApproveConcluding {
  type: 'ApproveConcluding';
  processId: string;
  channelId: string;
}

export interface DecideDefund {
  type: 'DecideDefund';
  processId: string;
  channelId: string;
}

export interface WaitForDefund {
  type: 'WaitForDefund';
  processId: string;
  channelId: string;
  defundingState: DefundingState;
}

export interface Failure {
  type: 'Failure';
  reason: FailureReason;
}

export interface Success {
  type: 'Success';
}

// -------
// Helpers
// -------

export function isTerminal(state: ConcludingState): state is Failure | Success {
  return state.type === 'Failure' || state.type === 'Success';
}

export function isSuccess(state: ConcludingState): state is Success {
  return state.type === 'Success';
}

export function isFailure(state: ConcludingState): state is Failure {
  return state.type === 'Failure';
}

// ------------
// Constructors
// ------------

export const approveConcluding: Constructor<ApproveConcluding> = p => {
  const { processId, channelId } = p;
  return { type: 'ApproveConcluding', processId, channelId };
};

export const decideDefund: Constructor<DecideDefund> = p => {
  const { processId, channelId } = p;
  return { type: 'DecideDefund', processId, channelId };
};

export const acknowledgeSuccess: Constructor<AcknowledgeSuccess> = p => {
  const { processId, channelId } = p;
  return { type: 'AcknowledgeSuccess', processId, channelId };
};

export const acknowledgeFailure: Constructor<AcknowledgeFailure> = p => {
  const { processId, channelId, reason } = p;
  return { type: 'AcknowledgeFailure', processId, channelId, reason };
};

export const waitForDefund: Constructor<WaitForDefund> = p => {
  const { processId, channelId, defundingState } = p;
  return { type: 'WaitForDefund', processId, channelId, defundingState };
};

export function success(): Success {
  return { type: 'Success' };
}

export const failure: Constructor<Failure> = p => {
  const { reason } = p;
  return { type: 'Failure', reason };
};
