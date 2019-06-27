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
  type: 'NewLedgerFunding.Success';
}

export interface Failure {
  type: 'NewLedgerFunding.Failure';
}

// ------------
// Constructors
// ------------

export const success: StateConstructor<Success> = p => {
  return { type: 'NewLedgerFunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { type: 'NewLedgerFunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalNewLedgerFundingState = PlayerAState | PlayerBState;
export type NewLedgerFundingState = NonTerminalNewLedgerFundingState | Success | Failure;
export type NewLedgerFundingStateType = NewLedgerFundingState['type'];

export function isNewLedgerFundingState(state: ProtocolState): state is NewLedgerFundingState {
  return (
    state.type === 'NewLedgerFunding.Failure' ||
    state.type === 'NewLedgerFunding.Success' ||
    isPlayerAState(state) ||
    isPlayerBState(state)
  );
}

export function isTerminal(state: NewLedgerFundingState): state is Failure | Success {
  return state.type === 'NewLedgerFunding.Failure' || state.type === 'NewLedgerFunding.Success';
}
