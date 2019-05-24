import { PlayerAState, isPlayerAState } from './player-a/states';
import { PlayerBState, isPlayerBState } from './player-b/states';

export * from './player-a/states';
export * from './player-b/states';
import { ProtocolState } from '..';
import { StateConstructor } from '../../utils';

// -------
// States
// -------

export interface Success {
  type: 'IndirectFunding.Success';
}

export interface Failure {
  type: 'IndirectFunding.Failure';
}

// ------------
// Constructors
// ------------

export const success: StateConstructor<Success> = p => {
  return { type: 'IndirectFunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { type: 'IndirectFunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalIndirectFundingState = PlayerAState | PlayerBState;
export type IndirectFundingState = NonTerminalIndirectFundingState | Success | Failure;
export type IndirectFundingStateType = IndirectFundingState['type'];

export function isIndirectFundingState(state: ProtocolState): state is IndirectFundingState {
  return (
    state.type === 'IndirectFunding.Failure' ||
    state.type === 'IndirectFunding.Success' ||
    isPlayerAState(state) ||
    isPlayerBState(state)
  );
}

export function isTerminal(state: IndirectFundingState): state is Failure | Success {
  return state.type === 'IndirectFunding.Failure' || state.type === 'IndirectFunding.Success';
}
