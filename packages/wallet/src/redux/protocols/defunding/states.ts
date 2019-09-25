import { StateConstructor } from '../../utils';
import { LedgerDefundingState } from '../ledger-defunding/states';
import { ProtocolState } from '..';
import { NonTerminalVirtualDefundingState } from '../virtual-defunding/states';
import { ProtocolLocator } from '../../../communication';

// -------
// States
// -------

export interface WaitForLedgerDefunding {
  type: 'Defunding.WaitForLedgerDefunding';
  processId: string;
  ledgerDefundingState: LedgerDefundingState;
  channelId;
  ledgerId: string;
  protocolLocator: ProtocolLocator;
}

export interface WaitForVirtualDefunding {
  type: 'Defunding.WaitForVirtualDefunding';
  processId: string;
  virtualDefunding: NonTerminalVirtualDefundingState;
  channelId: string;
  ledgerId: string;
  protocolLocator: ProtocolLocator;
}

export interface Failure {
  type: 'Defunding.Failure';
  reason:
    | 'Virtual Defunding Failure'
    | 'Ledger Defunding Failure'
    | 'Channel Not Closed'
    | 'Cannot Defund Directly Funded Channel';
}

export interface Success {
  type: 'Defunding.Success';
}

// -------
// Constructors
// -------

export const waitForLedgerDefunding: StateConstructor<WaitForLedgerDefunding> = p => {
  return { ...p, type: 'Defunding.WaitForLedgerDefunding' };
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

export type NonTerminalDefundingState = WaitForLedgerDefunding | WaitForVirtualDefunding;
export type TerminalDefundingState = Failure | Success;
export type DefundingState = NonTerminalDefundingState | TerminalDefundingState;

export type DefundingStateType = DefundingState['type'];

export function isTerminalDefundingState(state: DefundingState): state is Failure | Success {
  return state.type === 'Defunding.Failure' || state.type === 'Defunding.Success';
}

export function isDefundingState(state: ProtocolState): state is DefundingState {
  return (
    state.type === 'Defunding.WaitForLedgerDefunding' ||
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
