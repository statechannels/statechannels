import { NonTerminalExistingLedgerFundingState } from '../existing-ledger-funding';
import { StateConstructor } from '../../utils';
import { NonTerminalNewLedgerChannelState } from '../new-ledger-channel/states';
import { ProtocolLocator } from '../../../communication';

interface Base {
  processId: string;
  channelId: string;
  startingAllocation: string[];
  startingDestination: string[];
  protocolLocator: ProtocolLocator;
}
export interface WaitForNewLedgerChannel extends Base {
  type: 'LedgerFunding.WaitForNewLedgerChannel';
  newLedgerChannel: NonTerminalNewLedgerChannelState;
}

export interface WaitForExistingLedgerFunding extends Base {
  type: 'LedgerFunding.WaitForExistingLedgerFunding';
  existingLedgerFundingState: NonTerminalExistingLedgerFundingState;
  ledgerId: string;
}

export interface Failure {
  type: 'LedgerFunding.Failure';
  reason: string;
}

export interface Success {
  type: 'LedgerFunding.Success';
}

export const waitForNewLedgerChannel: StateConstructor<WaitForNewLedgerChannel> = p => {
  return { ...p, type: 'LedgerFunding.WaitForNewLedgerChannel' };
};
export const waitForExistingLedgerFunding: StateConstructor<WaitForExistingLedgerFunding> = p => {
  return { ...p, type: 'LedgerFunding.WaitForExistingLedgerFunding' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'LedgerFunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'LedgerFunding.Failure' };
};
export type NonTerminalLedgerFundingState = WaitForExistingLedgerFunding | WaitForNewLedgerChannel;
export type TerminalLedgerFundingState = Success | Failure;
export type LedgerFundingState = NonTerminalLedgerFundingState | TerminalLedgerFundingState;
export type LedgerFundingStateType = LedgerFundingState['type'];

export function isTerminal(state: LedgerFundingState): state is TerminalLedgerFundingState {
  return !![isSuccess, isFailure].find(g => g(state));
}

export function isSuccess(state: LedgerFundingState): state is Success {
  return state.type === 'LedgerFunding.Success';
}

export function isFailure(state: LedgerFundingState): state is Failure {
  return state.type === 'LedgerFunding.Failure';
}
