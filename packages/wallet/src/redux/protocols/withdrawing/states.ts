import { StateConstructor } from '../../utils';
import { NonTerminalTransactionSubmissionState as NonTerminalTSState } from '../transaction-submission/states';
import { ProtocolState } from '..';

// -------
// States
// -------

export interface WaitForApproval {
  type: 'Withdrawing.WaitforApproval';
  processId: string;
  channelId: string;
  withdrawalAmount: string;
}

export interface WaitForTransaction {
  type: 'Withdrawing.WaitForTransaction';
  processId: string;
  channelId: string;
  transactionSubmissionState: NonTerminalTSState;
  withdrawalAddress: string;
}

export interface WaitForAcknowledgement {
  type: 'Withdrawing.WaitForAcknowledgement';
  processId: string;
  channelId: string;
}

export const enum FailureReason {
  TransactionFailure = 'Transaction failed',
  ChannelNotClosed = 'Channel not closed',
  UserRejected = 'User rejected',
}
export interface Failure {
  type: 'Withdrawing.Failure';
  reason: string;
}

export interface Success {
  type: 'Withdrawing.Success';
}

// ------------
// Constructors
// ------------

export const waitForApproval: StateConstructor<WaitForApproval> = p => {
  return { ...p, type: 'Withdrawing.WaitforApproval' };
};

export const waitForTransaction: StateConstructor<WaitForTransaction> = p => {
  return { ...p, type: 'Withdrawing.WaitForTransaction' };
};

export const waitForAcknowledgement: StateConstructor<WaitForAcknowledgement> = p => {
  return { ...p, type: 'Withdrawing.WaitForAcknowledgement' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Withdrawing.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Withdrawing.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalWithdrawalState =
  | WaitForApproval
  | WaitForTransaction
  | WaitForAcknowledgement;

export type WithdrawalState = NonTerminalWithdrawalState | Failure | Success;

export type WithdrawalStateType = WithdrawalState['type'];

export function isTerminal(state: WithdrawalState): state is Failure | Success {
  return state.type === 'Withdrawing.Failure' || state.type === 'Withdrawing.Success';
}

export function isWithdrawalState(state: ProtocolState): state is WithdrawalState {
  return (
    state.type === 'Withdrawing.Failure' ||
    state.type === 'Withdrawing.Success' ||
    state.type === 'Withdrawing.WaitForAcknowledgement' ||
    state.type === 'Withdrawing.WaitforApproval' ||
    state.type === 'Withdrawing.WaitForTransaction'
  );
}
