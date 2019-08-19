import { InstigatorConcludingState, isConcludingInstigatorState } from './instigator/states';
import { ResponderConcludingState, isConcludingResponderState } from './responder/states';
import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';

export * from './instigator/states';
export * from './responder/states';

// -------
// States
// -------

export interface Failure {
  type: 'Concluding.Failure';
  reason: FailureReason;
}

export interface Success {
  type: 'Concluding.Success';
}

// -------
// Constructors
// -------

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Concluding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Concluding.Failure' };
};

// -------
// Unions and Guards
// -------

export type ConcludingState = InstigatorConcludingState | ResponderConcludingState;

export type TerminalConcludingState = Success | Failure;

export type FailureReason =
  | 'NotYourTurn'
  | 'ChannelDoesntExist'
  | 'ConcludeCancelled'
  | 'DefundFailed'
  | 'LedgerUpdateFailed';

export function isConcludingState(state: ProtocolState): state is ConcludingState {
  return isConcludingInstigatorState(state) || isConcludingResponderState(state);
}

export function isTerminalConcludingState(state: ConcludingState): state is Failure | Success {
  return state.type === 'Concluding.Failure' || state.type === 'Concluding.Success';
}

export function isSuccess(state: ConcludingState): state is Success {
  return state.type === 'Concluding.Success';
}

export function isFailure(state: ConcludingState): state is Failure {
  return state.type === 'Concluding.Failure';
}
