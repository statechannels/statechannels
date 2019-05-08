import { Properties as P } from '../../../utils';
import { DirectFundingState } from '../../direct-funding/state';
import { NonTerminalIndirectFundingState } from '../state';

export type PlayerBState =
  | BWaitForPreFundSetup0
  | BWaitForDirectFunding
  | BWaitForLedgerUpdate0
  | BWaitForPostFundSetup0;

export interface BWaitForPreFundSetup0 {
  type: 'BWaitForPreFundSetup0';
  channelId: string;
  processId: string;
}

export interface BWaitForDirectFunding {
  type: 'BWaitForDirectFunding';
  channelId: string;
  ledgerId: string;
  directFundingState: DirectFundingState;
  processId: string;
}
export interface BWaitForLedgerUpdate0 {
  type: 'BWaitForLedgerUpdate0';
  channelId: string;
  ledgerId: string;
  processId: string;
}
export interface BWaitForPostFundSetup0 {
  type: 'BWaitForPostFundSetup0';
  channelId: string;
  ledgerId: string;
  processId: string;
}

// -------
// Helpers
// -------

export function isPlayerBState(state: NonTerminalIndirectFundingState): state is PlayerBState {
  return (
    state.type === 'BWaitForPreFundSetup0' ||
    state.type === 'BWaitForDirectFunding' ||
    state.type === 'BWaitForPostFundSetup0' ||
    state.type === 'BWaitForLedgerUpdate0'
  );
}

// --------
// Creators
// --------

export function bWaitForPreFundSetup0(params: P<BWaitForPreFundSetup0>): BWaitForPreFundSetup0 {
  const { channelId, processId } = params;
  return { type: 'BWaitForPreFundSetup0', channelId, processId };
}

export function bWaitForDirectFunding(params: P<BWaitForDirectFunding>): BWaitForDirectFunding {
  const { channelId, ledgerId, directFundingState, processId } = params;
  return {
    type: 'BWaitForDirectFunding',
    channelId,
    ledgerId,
    directFundingState,
    processId,
  };
}

export function bWaitForPostFundSetup0(params: P<BWaitForPostFundSetup0>): BWaitForPostFundSetup0 {
  const { channelId, ledgerId, processId } = params;
  return { type: 'BWaitForPostFundSetup0', channelId, ledgerId, processId };
}

export function bWaitForLedgerUpdate0(params: P<BWaitForLedgerUpdate0>): BWaitForLedgerUpdate0 {
  const { channelId, ledgerId, processId } = params;
  return { type: 'BWaitForLedgerUpdate0', channelId, ledgerId, processId };
}
