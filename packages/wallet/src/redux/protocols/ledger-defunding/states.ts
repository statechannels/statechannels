import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';
import { ConsensusUpdateState } from '../consensus-update/states';
import { ProtocolLocator } from '../../../communication';
// -------
// States
// -------

export interface WaitForLedgerUpdate {
  type: 'LedgerDefunding.WaitForLedgerUpdate';
  processId: string;
  ledgerId: string;
  channelId: string;
  clearedToProceed: boolean;
  ledgerUpdate: ConsensusUpdateState;
  protocolLocator: ProtocolLocator;
}

export interface Failure {
  type: 'LedgerDefunding.Failure';
  reason: string;
}

export interface Success {
  type: 'LedgerDefunding.Success';
}

// -------
// Constructors
// -------

export const waitForLedgerUpdate: StateConstructor<WaitForLedgerUpdate> = p => {
  return {
    ...p,
    type: 'LedgerDefunding.WaitForLedgerUpdate',
  };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'LedgerDefunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'LedgerDefunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalLedgerDefundingState = WaitForLedgerUpdate;
export type LedgerDefundingState = NonTerminalLedgerDefundingState | Success | Failure;
export type LedgerDefundingStateType = LedgerDefundingState['type'];

export function isTerminal(state: LedgerDefundingState): state is Failure | Success {
  return state.type === 'LedgerDefunding.Failure' || state.type === 'LedgerDefunding.Success';
}

export function isLedgerDefundingState(state: ProtocolState): state is LedgerDefundingState {
  return (
    state.type === 'LedgerDefunding.WaitForLedgerUpdate' ||
    state.type === 'LedgerDefunding.Failure' ||
    state.type === 'LedgerDefunding.Success'
  );
}
