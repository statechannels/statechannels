import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';
import { AdvanceChannelState } from '../advance-channel';
import { DefundingState } from '../defunding/states';
import { NonTerminalCloseLedgerChannelState } from '../close-ledger-channel/states';

// -------
// States
// -------

export interface BaseState {
  channelId: string;
  processId: string;
  ledgerId: string;
}

export interface Failure {
  type: 'Concluding.Failure';
  reason: 'Close Ledger Channel Failure' | 'Defunding Failure' | 'Advance Channel Failure';
}

export interface Success {
  type: 'Concluding.Success';
}

export interface WaitForConclude extends BaseState {
  type: 'Concluding.WaitForConclude';
  concluding: AdvanceChannelState;
}

export interface WaitForDefund extends BaseState {
  type: 'Concluding.WaitForDefund';
  defunding: DefundingState;
}
export interface DecideClosing extends BaseState {
  type: 'Concluding.DecideClosing';
}
export interface WaitForLedgerClose extends BaseState {
  type: 'Concluding.WaitForLedgerClose';
  ledgerClosing: NonTerminalCloseLedgerChannelState;
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
export const waitForDefund: StateConstructor<WaitForDefund> = p => {
  return { ...p, type: 'Concluding.WaitForDefund' };
};

export const waitForConclude: StateConstructor<WaitForConclude> = p => {
  return { ...p, type: 'Concluding.WaitForConclude' };
};

export const waitForLedgerClose: StateConstructor<WaitForLedgerClose> = p => {
  return { ...p, type: 'Concluding.WaitForLedgerClose' };
};

export const decideClosing: StateConstructor<DecideClosing> = p => {
  return { ...p, type: 'Concluding.DecideClosing' };
};
// -------
// Unions and Guards
// -------

export type NonTerminalConcludingState =
  | WaitForConclude
  | WaitForDefund
  | DecideClosing
  | WaitForLedgerClose;
export type TerminalConcludingState = Success | Failure;
export type ConcludingState = TerminalConcludingState | NonTerminalConcludingState;
export type ConcludingStateType = ConcludingState['type'];

export function isConcludingState(state: ProtocolState): state is ConcludingState {
  return state.type.indexOf('Concluding.') === 0;
}

export function isTerminalConcludingState(state: ProtocolState): state is TerminalConcludingState {
  return state.type === 'Concluding.Failure' || state.type === 'Concluding.Success';
}
export function isNonTerminalConcludingState(
  state: ProtocolState,
): state is NonTerminalConcludingState {
  return isConcludingState(state) && !isTerminalConcludingState(state);
}
