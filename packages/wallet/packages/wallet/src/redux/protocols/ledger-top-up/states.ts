import { DirectFundingState } from '../direct-funding/states';
import { StateConstructor } from '../../utils';
import { ConsensusUpdateState } from '../consensus-update';

export interface WaitForDirectFundingForA {
  type: 'LedgerTopUp.WaitForDirectFundingForA';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
  originalAllocation: string[];
  directFundingState: DirectFundingState;
}

export interface WaitForDirectFundingForB {
  type: 'LedgerTopUp.WaitForDirectFundingForB';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
  originalAllocation: string[];
  directFundingState: DirectFundingState;
}
export interface SwitchOrderAndAddATopUpUpdate {
  type: 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
  originalAllocation: string[];
  consensusUpdateState: ConsensusUpdateState;
}
export interface RestoreOrderAndAddBTopUpUpdate {
  type: 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
  originalAllocation: string[];
  consensusUpdateState: ConsensusUpdateState;
}

export interface Failure {
  type: 'LedgerTopUp.Failure';
  reason: string;
}

export interface Success {
  type: 'LedgerTopUp.Success';
}

export const waitForDirectFundingForA: StateConstructor<WaitForDirectFundingForA> = p => {
  return { ...p, type: 'LedgerTopUp.WaitForDirectFundingForA' };
};

export const waitForDirectFundingForB: StateConstructor<WaitForDirectFundingForB> = p => {
  return { ...p, type: 'LedgerTopUp.WaitForDirectFundingForB' };
};

export const switchOrderAndAddATopUpUpdate: StateConstructor<SwitchOrderAndAddATopUpUpdate> = p => {
  return { ...p, type: 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate' };
};

export const restoreOrderAndAddBTopUpUpdate: StateConstructor<
  RestoreOrderAndAddBTopUpUpdate
> = p => {
  return { ...p, type: 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate' };
};
export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'LedgerTopUp.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'LedgerTopUp.Failure' };
};

export type LedgerTopUpState =
  | WaitForDirectFundingForA
  | WaitForDirectFundingForB
  | SwitchOrderAndAddATopUpUpdate
  | RestoreOrderAndAddBTopUpUpdate
  | Success
  | Failure;

export type LedgerTopUpStateType = LedgerTopUpState['type'];
