import { NonTerminalTransactionSubmissionState as NonTerminalTSState } from '../../transaction-submission/states';
import { Commitment } from '../../../../domain';
import { ProtocolState } from '../..';
import { StateConstructor } from '../../../utils';

// -------
// States
// -------

export const enum FailureReason {
  TransactionFailure = 'Transaction failed',
  TimeOut = 'Challenge timed out',
}

export interface WaitForApproval {
  type: 'Responding.WaitForApproval';
  processId: string;
  channelId: string;
  challengeCommitment: Commitment;
  expiryTime: number;
}

export interface WaitForTransaction {
  type: 'Responding.WaitForTransaction';
  processId: string;
  channelId: string;
  transactionSubmissionState: NonTerminalTSState;
}
export interface WaitForAcknowledgement {
  type: 'Responding.WaitForAcknowledgement';
  processId: string;
  channelId: string;
}

export interface WaitForResponse {
  type: 'Responding.WaitForResponse';
  processId: string;
  channelId: string;
}

export interface AcknowledgeTimeout {
  type: 'Responding.AcknowledgeTimeout';
  processId: string;
  channelId: string;
}

export interface Failure {
  type: 'Responding.Failure';
  reason: FailureReason;
}

export interface Success {
  type: 'Responding.Success';
}

// -------
// Constructors
// -------

export const waitForApproval: StateConstructor<WaitForApproval> = p => {
  return { ...p, type: 'Responding.WaitForApproval' };
};

export const waitForTransaction: StateConstructor<WaitForTransaction> = p => {
  return {
    ...p,
    type: 'Responding.WaitForTransaction',
  };
};

export const waitForAcknowledgement: StateConstructor<WaitForAcknowledgement> = p => {
  return { ...p, type: 'Responding.WaitForAcknowledgement' };
};

export const waitForResponse: StateConstructor<WaitForResponse> = p => {
  return { ...p, type: 'Responding.WaitForResponse' };
};

export const acknowledgeTimeout: StateConstructor<AcknowledgeTimeout> = p => {
  return { ...p, type: 'Responding.AcknowledgeTimeout' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Responding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Responding.Failure' };
};

// -------
// Unions and Guards
// -------
export type ResponderState = NonTerminalResponderState | Success | Failure;

export type ResponderStateType = ResponderState['type'];

export type NonTerminalResponderState =
  | WaitForApproval
  | WaitForTransaction
  | WaitForAcknowledgement
  | WaitForResponse
  | AcknowledgeTimeout;

export type TerminalResponderState = Failure | Success;
export function isResponderState(state: ProtocolState): state is ResponderState {
  return (
    state.type === 'Responding.WaitForApproval' ||
    state.type === 'Responding.WaitForTransaction' ||
    state.type === 'Responding.WaitForAcknowledgement' ||
    state.type === 'Responding.WaitForResponse' ||
    state.type === 'Responding.AcknowledgeTimeout' ||
    state.type === 'Responding.Failure' ||
    state.type === 'Responding.Success'
  );
}

export function isNonTerminalResponderState(
  state: ProtocolState,
): state is NonTerminalResponderState {
  return isResponderState(state) && !isTerminal(state);
}

export function isTerminal(state: ResponderState): state is TerminalResponderState {
  return state.type === 'Responding.Failure' || state.type === 'Responding.Success';
}
