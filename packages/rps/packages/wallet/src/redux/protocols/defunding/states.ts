import { WithdrawalState } from '../withdrawing/states';
import { StateConstructor } from '../../utils';
import { IndirectDefundingState } from '../indirect-defunding/states';
import { ProtocolState } from '..';
import { NonTerminalVirtualDefundingState } from '../virtual-defunding/states';

// -------
// States
// -------

export type FailureReason =
  | 'Withdrawal Failure'
  | 'Ledger De-funding Failure'
  | 'Channel Not Closed';

export interface WaitForWithdrawal {
  type: 'Defunding.WaitForWithdrawal';
  processId: string;
  withdrawalState: WithdrawalState;
  channelId;
}

export interface WaitForIndirectDefunding {
  type: 'Defunding.WaitForIndirectDefunding';
  processId: string;
  indirectDefundingState: IndirectDefundingState;
  channelId;
  ledgerId: string;
}

export interface WaitForVirtualDefunding {
  type: 'Defunding.WaitForVirtualDefunding';
  processId: string;
  virtualDefunding: NonTerminalVirtualDefundingState;
  indirectDefundingState: IndirectDefundingState;
  channelId: string;
  ledgerId: string;
}

export interface Failure {
  type: 'Defunding.Failure';
  reason: string;
}

export interface Success {
  type: 'Defunding.Success';
}

// -------
// Constructors
// -------

export const waitForWithdrawal: StateConstructor<WaitForWithdrawal> = p => {
  return { ...p, type: 'Defunding.WaitForWithdrawal' };
};

export const waitForLedgerDefunding: StateConstructor<WaitForIndirectDefunding> = p => {
  return { ...p, type: 'Defunding.WaitForIndirectDefunding' };
};

export const waitForVirtualDefunding: StateConstructor<WaitForVirtualDefunding> = p => {
  return { ...p, type: 'Defunding.WaitForVirtualDefunding' };
};
export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Defunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Defunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalDefundingState =
  | WaitForWithdrawal
  | WaitForIndirectDefunding
  | WaitForVirtualDefunding;
export type TerminalDefundingState = Failure | Success;
export type DefundingState = NonTerminalDefundingState | TerminalDefundingState;
export type DefundingStateType = DefundingState['type'];

export function isTerminalDefundingState(state: DefundingState): state is Failure | Success {
  return state.type === 'Defunding.Failure' || state.type === 'Defunding.Success';
}

export function isDefundingState(state: ProtocolState): state is DefundingState {
  return (
    state.type === 'Defunding.WaitForWithdrawal' ||
    state.type === 'Defunding.WaitForIndirectDefunding' ||
    state.type === 'Defunding.WaitForVirtualDefunding' ||
    state.type === 'Defunding.Failure' ||
    state.type === 'Defunding.Success'
  );
}

export function isSuccess(state: DefundingState): state is Success {
  return state.type === 'Defunding.Success';
}

export function isFailure(state: DefundingState): state is Failure {
  return state.type === 'Defunding.Failure';
}
