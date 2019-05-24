import { DirectFundingState } from '../../direct-funding/states';
import { StateConstructor } from '../../../utils';
import { ProtocolState } from '../..';

// -------
// States
// -------

export interface BWaitForPreFundSetup0 {
  type: 'IndirectFunding.BWaitForPreFundSetup0';
  channelId: string;
  processId: string;
}

export interface BWaitForDirectFunding {
  type: 'IndirectFunding.BWaitForDirectFunding';
  channelId: string;
  ledgerId: string;
  directFundingState: DirectFundingState;
  processId: string;
}
export interface BWaitForLedgerUpdate0 {
  type: 'IndirectFunding.BWaitForLedgerUpdate0';
  channelId: string;
  ledgerId: string;
  processId: string;
}
export interface BWaitForPostFundSetup0 {
  type: 'IndirectFunding.BWaitForPostFundSetup0';
  channelId: string;
  ledgerId: string;
  processId: string;
}

// ------------
// Constructors
// ------------

export const bWaitForPreFundSetup0: StateConstructor<BWaitForPreFundSetup0> = p => {
  return { ...p, type: 'IndirectFunding.BWaitForPreFundSetup0' };
};

export const bWaitForDirectFunding: StateConstructor<BWaitForDirectFunding> = p => {
  return {
    ...p,
    type: 'IndirectFunding.BWaitForDirectFunding',
  };
};

export const bWaitForPostFundSetup0: StateConstructor<BWaitForPostFundSetup0> = p => {
  return { ...p, type: 'IndirectFunding.BWaitForPostFundSetup0' };
};

export const bWaitForLedgerUpdate0: StateConstructor<BWaitForLedgerUpdate0> = p => {
  return { ...p, type: 'IndirectFunding.BWaitForLedgerUpdate0' };
};

// -------
// Unions and Guards
// -------

export type PlayerBState =
  | BWaitForPreFundSetup0
  | BWaitForDirectFunding
  | BWaitForLedgerUpdate0
  | BWaitForPostFundSetup0;

export function isPlayerBState(state: ProtocolState): state is PlayerBState {
  return (
    state.type === 'IndirectFunding.BWaitForPreFundSetup0' ||
    state.type === 'IndirectFunding.BWaitForDirectFunding' ||
    state.type === 'IndirectFunding.BWaitForPostFundSetup0' ||
    state.type === 'IndirectFunding.BWaitForLedgerUpdate0'
  );
}
