import { NonTerminalExistingLedgerFundingState } from '../existing-ledger-funding';
import { StateConstructor } from '../../utils';
import { NonTerminalNewLedgerFundingState } from '../new-ledger-funding/states';

export interface WaitForNewLedgerFunding {
  type: 'IndirectFunding.WaitForNewLedgerFunding';
  processId: string;
  newLedgerFundingState: NonTerminalNewLedgerFundingState;
  channelId: string;
}

export interface WaitForExistingLedgerFunding {
  type: 'IndirectFunding.WaitForExistingLedgerFunding';
  processId: string;
  existingLedgerFundingState: NonTerminalExistingLedgerFundingState;
  channelId: string;
  ledgerId: string;
}

export interface Failure {
  type: 'IndirectFunding.Failure';
  reason: string;
}

export interface Success {
  type: 'IndirectFunding.Success';
}

export const waitForNewLedgerFunding: StateConstructor<WaitForNewLedgerFunding> = p => {
  return { ...p, type: 'IndirectFunding.WaitForNewLedgerFunding' };
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
  | WaitForNewLedgerFunding;
export type TerminalIndirectFundingState = Success | Failure;
export type IndirectFundingState = NonTerminalIndirectFundingState | TerminalIndirectFundingState;
export type IndirectFundingStateType = IndirectFundingState['type'];
export function isTerminal(state: IndirectFundingState): state is TerminalIndirectFundingState {
  return state.type === 'IndirectFunding.Failure' || state.type === 'IndirectFunding.Success';
}
