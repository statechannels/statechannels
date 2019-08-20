import { WithdrawalState } from '../withdrawing/states';
import { AdvanceChannelState } from '../advance-channel';
import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';

export interface WaitForWithdrawal {
  type: 'CloseLedgerChannel.WaitForWithdrawal';
  processId: string;
  withdrawal: WithdrawalState;
  channelId;
}
export interface WaitForConclude {
  type: 'CloseLedgerChannel.WaitForConclude';
  processId: string;
  concluding: AdvanceChannelState;
  channelId;
}

export interface Failure {
  type: 'CloseLedgerChannel.Failure';
  reason: 'Channel In Use' | 'Withdrawal Failure' | 'Advance Channel Failure';
}

export interface Success {
  type: 'CloseLedgerChannel.Success';
}

// -------
// Constructors
// -------

export const waitForWithdrawal: StateConstructor<WaitForWithdrawal> = p => {
  return { ...p, type: 'CloseLedgerChannel.WaitForWithdrawal' };
};

export const waitForConclude: StateConstructor<WaitForConclude> = p => {
  return { ...p, type: 'CloseLedgerChannel.WaitForConclude' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'CloseLedgerChannel.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'CloseLedgerChannel.Failure' };
};

// -------
// Unions and Guards
// -------
export type TerminalCloseLedgerChannelState = Failure | Success;
export type NonTerminalCloseLedgerChannelState = WaitForConclude | WaitForWithdrawal;
export type CloseLedgerChannelState =
  | TerminalCloseLedgerChannelState
  | NonTerminalCloseLedgerChannelState;
export type CloseLedgerChannelStateType = CloseLedgerChannelState['type'];

export function isCloseLedgerChannelState(state: ProtocolState): state is CloseLedgerChannelState {
  return state.type.indexOf('CloseLedgerChannel') === 0;
}

export function isTerminalCloseLedgerChannelState(
  state: ProtocolState,
): state is TerminalCloseLedgerChannelState {
  return state.type === 'CloseLedgerChannel.Failure' || state.type === 'CloseLedgerChannel.Success';
}
export function isNonTerminalCloseLedgerChannelState(
  state: ProtocolState,
): state is NonTerminalCloseLedgerChannelState {
  return !isTerminalCloseLedgerChannelState(state);
}
