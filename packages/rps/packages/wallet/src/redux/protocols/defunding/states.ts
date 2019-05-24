import { WithdrawalState } from '../withdrawing/states';
import { StateConstructor } from '../../utils';
import { IndirectDefundingState } from '../indirect-defunding/states';
import { ProtocolState } from '..';

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

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Defunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Defunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalDefundingState = WaitForWithdrawal | WaitForIndirectDefunding;
export type DefundingState = WaitForWithdrawal | WaitForIndirectDefunding | Failure | Success;
export type DefundingStateType = DefundingState['type'];

export function isTerminal(state: DefundingState): state is Failure | Success {
  return state.type === 'Defunding.Failure' || state.type === 'Defunding.Success';
}

export function isDefundingState(state: ProtocolState): state is DefundingState {
  return (
    state.type === 'Defunding.WaitForWithdrawal' ||
    state.type === 'Defunding.WaitForIndirectDefunding' ||
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
