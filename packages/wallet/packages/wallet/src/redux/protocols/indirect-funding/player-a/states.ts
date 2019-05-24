import { DirectFundingState } from '../../direct-funding/states';
import { StateConstructor } from '../../../utils';
import { ProtocolState } from '../..';

// -------
// States
// -------

export interface AWaitForPreFundSetup1 {
  type: 'IndirectFunding.AWaitForPreFundSetup1';
  channelId: string;
  ledgerId: string;
  processId: string;
}

export interface AWaitForDirectFunding {
  type: 'IndirectFunding.AWaitForDirectFunding';
  channelId: string;
  ledgerId: string;
  processId: string;
  directFundingState: DirectFundingState;
}
export interface AWaitForPostFundSetup1 {
  type: 'IndirectFunding.AWaitForPostFundSetup1';
  channelId: string;
  ledgerId: string;
  processId: string;
}
export interface AWaitForLedgerUpdate1 {
  type: 'IndirectFunding.AWaitForLedgerUpdate1';
  channelId: string;
  ledgerId: string;
  processId: string;
}

// ------------
// Constructors
// ------------

export const aWaitForPreFundSetup1: StateConstructor<AWaitForPreFundSetup1> = p => {
  return { ...p, type: 'IndirectFunding.AWaitForPreFundSetup1' };
};

export const aWaitForDirectFunding: StateConstructor<AWaitForDirectFunding> = p => {
  return {
    ...p,
    type: 'IndirectFunding.AWaitForDirectFunding',
  };
};

export const aWaitForPostFundSetup1: StateConstructor<AWaitForPostFundSetup1> = p => {
  return { ...p, type: 'IndirectFunding.AWaitForPostFundSetup1' };
};

export const aWaitForLedgerUpdate1: StateConstructor<AWaitForLedgerUpdate1> = p => {
  return { ...p, type: 'IndirectFunding.AWaitForLedgerUpdate1' };
};

// -------
// Unions and Guards
// -------

export type PlayerAState =
  | AWaitForPreFundSetup1
  | AWaitForDirectFunding
  | AWaitForPostFundSetup1
  | AWaitForLedgerUpdate1;

export function isPlayerAState(state: ProtocolState): state is PlayerAState {
  return (
    state.type === 'IndirectFunding.AWaitForPreFundSetup1' ||
    state.type === 'IndirectFunding.AWaitForDirectFunding' ||
    state.type === 'IndirectFunding.AWaitForPostFundSetup1' ||
    state.type === 'IndirectFunding.AWaitForLedgerUpdate1'
  );
}
