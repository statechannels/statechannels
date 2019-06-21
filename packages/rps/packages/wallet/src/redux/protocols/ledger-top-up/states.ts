import { DirectFundingState } from '../direct-funding/states';
import { StateConstructor } from '../../utils';

export interface WaitForDirectFunding {
  type: 'LedgerTopUp.WaitForDirectFunding';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
  directFundingState: DirectFundingState;
}

export interface WaitForPreTopUpLedgerUpdate {
  type: 'LedgerTopUp.WaitForPreTopUpLedgerUpdate';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
}
export interface WaitForPostTopUpLedgerUpdate {
  type: 'LedgerTopUp.WaitForPostTopUpLedgerUpdate';
  channelId: string;
  ledgerId: string;
  processId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
}

export interface Failure {
  type: 'LedgerTopUp.Failure';
  reason: string;
}

export interface Success {
  type: 'LedgerTopUp.Success';
}
export const waitForDirectFunding: StateConstructor<WaitForDirectFunding> = p => {
  return {
    ...p,
    type: 'LedgerTopUp.WaitForDirectFunding',
  };
};

export const waitForPreTopUpLedgerUpdate: StateConstructor<WaitForPreTopUpLedgerUpdate> = p => {
  return {
    ...p,
    type: 'LedgerTopUp.WaitForPreTopUpLedgerUpdate',
  };
};

export const waitForPostTopUpLedgerUpdate: StateConstructor<WaitForPostTopUpLedgerUpdate> = p => {
  return {
    ...p,
    type: 'LedgerTopUp.WaitForPostTopUpLedgerUpdate',
  };
};
export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'LedgerTopUp.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'LedgerTopUp.Failure' };
};

export type LedgerTopUpState =
  | WaitForPreTopUpLedgerUpdate
  | WaitForPostTopUpLedgerUpdate
  | WaitForDirectFunding
  | Success
  | Failure;

export type LedgerTopUpStateType = LedgerTopUpState['type'];
