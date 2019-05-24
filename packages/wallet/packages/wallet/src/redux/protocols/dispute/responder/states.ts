import { NonTerminalTransactionSubmissionState as NonTerminalTSState } from '../../transaction-submission/states';
import { Commitment } from '../../../../domain';
import { ProtocolState } from '../..';
import { DefundingState } from '../../defunding';
import { StateConstructor } from '../../../utils';

// -------
// States
// -------

export const enum FailureReason {
  TransactionFailure = 'Transaction failed',
}

export interface WaitForApproval {
  type: 'Responding.WaitForApproval';
  processId: string;
  channelId: string;
  challengeCommitment: Commitment;
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

export interface WaitForDefund {
  type: 'Responding.WaitForDefund';
  processId: string;
  defundingState: DefundingState;
  channelId: string;
}

export interface AcknowledgeDefundingSuccess {
  type: 'Responding.AcknowledgeDefundingSuccess';
  processId: string;
  channelId: string;
}

export interface AcknowledgeClosedButNotDefunded {
  type: 'Responding.AcknowledgeClosedButNotDefunded';
  processId: string;
  channelId: string;
}
export interface Failure {
  type: 'Responding.Failure';
  reason: string;
}

export interface ClosedAndDefunded {
  type: 'Responding.ClosedAndDefunded';
}

export interface ClosedButNotDefunded {
  type: 'Responding.ClosedButNotDefunded';
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

export const waitForDefund: StateConstructor<WaitForDefund> = p => {
  return { ...p, type: 'Responding.WaitForDefund' };
};

export const acknowledgeDefundingSuccess: StateConstructor<AcknowledgeDefundingSuccess> = p => {
  return { ...p, type: 'Responding.AcknowledgeDefundingSuccess' };
};

export const acknowledgeClosedButNotDefunded: StateConstructor<
  AcknowledgeClosedButNotDefunded
> = p => {
  return { ...p, type: 'Responding.AcknowledgeClosedButNotDefunded' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Responding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Responding.Failure' };
};

export const closedAndDefunded: StateConstructor<ClosedAndDefunded> = p => {
  return { ...p, type: 'Responding.ClosedAndDefunded' };
};
export const closedButNotDefunded: StateConstructor<ClosedButNotDefunded> = p => {
  return { ...p, type: 'Responding.ClosedButNotDefunded' };
};

// -------
// Unions and Guards
// -------
export type ResponderState =
  | NonTerminalResponderState
  | Success
  | ClosedAndDefunded
  | ClosedButNotDefunded
  | Failure;

export type ResponderStateType = ResponderState['type'];

export type NonTerminalResponderState =
  | WaitForApproval
  | WaitForTransaction
  | WaitForAcknowledgement
  | WaitForResponse
  | AcknowledgeTimeout
  | WaitForDefund
  | AcknowledgeDefundingSuccess
  | AcknowledgeClosedButNotDefunded;

export type TerminalResponderState = ClosedAndDefunded | ClosedButNotDefunded | Success;
export function isResponderState(state: ProtocolState): state is ResponderState {
  return (
    state.type === 'Responding.WaitForApproval' ||
    state.type === 'Responding.WaitForTransaction' ||
    state.type === 'Responding.WaitForAcknowledgement' ||
    state.type === 'Responding.WaitForResponse' ||
    state.type === 'Responding.AcknowledgeTimeout' ||
    state.type === 'Responding.WaitForDefund' ||
    state.type === 'Responding.AcknowledgeDefundingSuccess' ||
    state.type === 'Responding.AcknowledgeClosedButNotDefunded' ||
    state.type === 'Responding.Failure' ||
    state.type === 'Responding.ClosedAndDefunded' ||
    state.type === 'Responding.ClosedButNotDefunded' ||
    state.type === 'Responding.Success'
  );
}

export function isNonTerminalResponderState(
  state: ProtocolState,
): state is NonTerminalResponderState {
  return isResponderState(state) && !isTerminal(state);
}

export function isTerminal(state: ResponderState): state is TerminalResponderState {
  return (
    state.type === 'Responding.ClosedAndDefunded' ||
    state.type === 'Responding.Failure' ||
    state.type === 'Responding.Success' ||
    state.type === 'Responding.ClosedButNotDefunded'
  );
}
