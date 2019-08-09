import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';
import { ConsensusUpdateState } from '../consensus-update/states';
import { ProtocolLocator } from '../../../communication';
import { AdvanceChannelState } from '../advance-channel';
// -------
// States
// -------

export interface WaitForConclude {
  type: 'IndirectDefunding.WaitForConclude';
  processId: string;
  ledgerId: string;
  channelId: string;
  concluding: AdvanceChannelState;
  protocolLocator: ProtocolLocator;
}

export interface WaitForLedgerUpdate {
  type: 'IndirectDefunding.WaitForLedgerUpdate';
  processId: string;
  ledgerId: string;
  channelId: string;
  clearedToProceed: boolean;
  ledgerUpdate: ConsensusUpdateState;
  concluding: AdvanceChannelState;
  protocolLocator: ProtocolLocator;
}

export interface Failure {
  type: 'IndirectDefunding.Failure';
  reason: string;
}

export interface Success {
  type: 'IndirectDefunding.Success';
}

// -------
// Constructors
// -------

export const waitForConclude: StateConstructor<WaitForConclude> = p => {
  return {
    ...p,
    type: 'IndirectDefunding.WaitForConclude',
  };
};
export const waitForLedgerUpdate: StateConstructor<WaitForLedgerUpdate> = p => {
  return {
    ...p,
    type: 'IndirectDefunding.WaitForLedgerUpdate',
  };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'IndirectDefunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'IndirectDefunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalIndirectDefundingState = WaitForLedgerUpdate | WaitForConclude;
export type IndirectDefundingState = NonTerminalIndirectDefundingState | Success | Failure;
export type IndirectDefundingStateType = IndirectDefundingState['type'];

export function isTerminal(state: IndirectDefundingState): state is Failure | Success {
  return state.type === 'IndirectDefunding.Failure' || state.type === 'IndirectDefunding.Success';
}

export function isIndirectDefundingState(state: ProtocolState): state is IndirectDefundingState {
  return (
    state.type === 'IndirectDefunding.WaitForConclude' ||
    state.type === 'IndirectDefunding.WaitForLedgerUpdate' ||
    state.type === 'IndirectDefunding.Failure' ||
    state.type === 'IndirectDefunding.Success'
  );
}
