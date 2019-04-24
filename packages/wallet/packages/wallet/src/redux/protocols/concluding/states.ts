import { Constructor } from '../../utils';

export type ConcludingState = NonTerminalState | PreTerminalState | TerminalState;
export type ConcludingStateType = ConcludingState['type'];

export type NonTerminalState =
  | AcknowledgeConcludingImpossible
  | ApproveConcluding
  | WaitForOpponentConclude
  | AcknowledgeChannelConcluded
  | AcknowledgeChannelDoesntExist
  | AcknowledgeDefundFailed
  | WaitForDefund
  | AcknowledgeChannelDoesntExist
  | AcknowledgeDefundFailed
  | AcknowledgeConcludingImpossible;

export type PreTerminalState =
  | AcknowledgeChannelDoesntExist
  | AcknowledgeDefundFailed
  | AcknowledgeConcludingImpossible;

export type TerminalState = Success | Failure;

export type FailureReason =
  | 'NotYourTurn'
  | 'ChannelDoesntExist'
  | 'ConcludeCancelled'
  | 'DefundFailed';

export interface AcknowledgeConcludingImpossible {
  type: 'AcknowledgeConcludingImpossible';
  processId: string;
}
export interface ApproveConcluding {
  type: 'ApproveConcluding';
  processId: string;
}

export interface WaitForOpponentConclude {
  type: 'WaitForOpponentConclude';
  processId: string;
}

export interface AcknowledgeChannelConcluded {
  type: 'AcknowledgeChannelConcluded';
  processId: string;
}

export interface AcknowledgeChannelDoesntExist {
  type: 'AcknowledgeChannelDoesntExist';
  processId: string;
}

export interface AcknowledgeDefundFailed {
  type: 'AcknowledgeDefundFailed';
  processId: string;
}

export interface WaitForDefund {
  type: 'WaitForDefund';
  processId: string;
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
export const acknowledgeConcludingImpossible: Constructor<AcknowledgeConcludingImpossible> = p => {
  const { processId } = p;
  return { type: 'AcknowledgeConcludingImpossible', processId };
};

export const approveConcluding: Constructor<ApproveConcluding> = p => {
  const { processId } = p;
  return { type: 'ApproveConcluding', processId };
};

export const waitForOpponentConclude: Constructor<WaitForOpponentConclude> = p => {
  const { processId } = p;
  return { type: 'WaitForOpponentConclude', processId };
};

export const acknowledgeChannelConcluded: Constructor<AcknowledgeChannelConcluded> = p => {
  const { processId } = p;
  return { type: 'AcknowledgeChannelConcluded', processId };
};

export const acknowledgeChannelDoesntExist: Constructor<AcknowledgeChannelDoesntExist> = p => {
  const { processId } = p;
  return { type: 'AcknowledgeChannelDoesntExist', processId };
};

export const acknowledgeDefundFailed: Constructor<AcknowledgeDefundFailed> = p => {
  const { processId } = p;
  return { type: 'AcknowledgeDefundFailed', processId };
};

export const waitForDefund: Constructor<WaitForDefund> = p => {
  const { processId } = p;
  return { type: 'WaitForDefund', processId };
};

export function success(): Success {
  return { type: 'Success' };
}

export const failure: Constructor<Failure> = p => {
  const { reason } = p;
  return { type: 'Failure', reason };
};
