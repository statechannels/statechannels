import { InstigatorConcludingState, isConcludingInstigatorState } from './instigator/states';
import { ResponderConcludingState, isConcludingResponderState } from './responder/states';
import { Constructor } from '../../utils';
import { ProtocolState } from '..';

export * from './instigator/states';
export * from './responder/states';

export type ConcludingState = InstigatorConcludingState | ResponderConcludingState;

export type TerminalState = Success | Failure;

export type FailureReason =
  | 'NotYourTurn'
  | 'ChannelDoesntExist'
  | 'ConcludeCancelled'
  | 'DefundFailed';

export interface Failure {
  type: 'Failure';
  reason: FailureReason;
}

export interface Success {
  type: 'Success';
}

export function success(): Success {
  return { type: 'Success' };
}

export const failure: Constructor<Failure> = p => {
  const { reason } = p;
  return { type: 'Failure', reason };
};

// -------
// Helpers
// -------

export function isConcludingState(state: ProtocolState): state is ConcludingState {
  return isConcludingInstigatorState(state) || isConcludingResponderState(state);
}

export function isTerminal(state: ConcludingState): state is Failure | Success {
  return state.type === 'Failure' || state.type === 'Success';
}

export function isSuccess(state: ConcludingState): state is Success {
  return state.type === 'Success';
}

export function isFailure(state: ConcludingState): state is Failure {
  return state.type === 'Failure';
}
