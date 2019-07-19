import { NonTerminalExistingLedgerFundingState } from '../existing-ledger-funding';
import { StateConstructor } from '../../utils';
import { NonTerminalNewLedgerChannelState } from '../new-ledger-channel/states';
import { ProtocolLocator } from '../../../communication';

interface Base {
  processId: string;
  channelId: string;
  targetAllocation: string[];
  targetDestination: string[];
  protocolLocator: ProtocolLocator;
}
export interface WaitForNewLedgerChannel extends Base {
  type: 'IndirectFunding.WaitForNewLedgerChannel';
  newLedgerChannel: NonTerminalNewLedgerChannelState;
}

export interface WaitForExistingLedgerFunding extends Base {
  type: 'IndirectFunding.WaitForExistingLedgerFunding';
  existingLedgerFundingState: NonTerminalExistingLedgerFundingState;
  ledgerId: string;
}

export interface Failure {
  type: 'IndirectFunding.Failure';
  reason: string;
}

export interface Success {
  type: 'IndirectFunding.Success';
}

export const waitForNewLedgerChannel: StateConstructor<WaitForNewLedgerChannel> = p => {
  return { ...p, type: 'IndirectFunding.WaitForNewLedgerChannel' };
};
export const waitForExistingLedgerFunding: StateConstructor<WaitForExistingLedgerFunding> = p => {
  return { ...p, type: 'IndirectFunding.WaitForExistingLedgerFunding' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'IndirectFunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'IndirectFunding.Failure' };
};
export type NonTerminalIndirectFundingState =
  | WaitForExistingLedgerFunding
  | WaitForNewLedgerChannel;
export type TerminalIndirectFundingState = Success | Failure;
export type IndirectFundingState = NonTerminalIndirectFundingState | TerminalIndirectFundingState;
export type IndirectFundingStateType = IndirectFundingState['type'];

export function isTerminal(state: IndirectFundingState): state is TerminalIndirectFundingState {
  return !![isSuccess, isFailure].find(g => g(state));
}

export function isSuccess(state: IndirectFundingState): state is Success {
  return state.type === 'IndirectFunding.Success';
}

export function isFailure(state: IndirectFundingState): state is Failure {
  return state.type === 'IndirectFunding.Failure';
}
