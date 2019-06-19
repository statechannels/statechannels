import { NonTerminalTransactionSubmissionState } from '../../transaction-submission';
import { ProtocolState } from '../..';
import { DefundingState } from '../../defunding';
import { StateConstructor } from '../../../utils';

// -------
// States
// -------

export type FailureReason =
  | 'ChannelDoesntExist'
  | 'NotFullyOpen'
  | 'DeclinedByUser'
  | 'AlreadyHaveLatest'
  | 'LatestWhileApproving'
  | 'TransactionFailed';

export interface ApproveChallenge {
  type: 'Challenging.ApproveChallenge';
  processId: string;
  channelId: string;
}

export interface WaitForTransaction {
  type: 'Challenging.WaitForTransaction';
  processId: string;
  channelId: string;
  expiryTime?: number;
  transactionSubmission: NonTerminalTransactionSubmissionState;
}

export interface WaitForResponseOrTimeout {
  type: 'Challenging.WaitForResponseOrTimeout';
  processId: string;
  channelId: string;
  expiryTime: number;
}

export interface AcknowledgeTimeout {
  type: 'Challenging.AcknowledgeTimeout';
  processId: string;
  channelId: string;
}

export interface AcknowledgeFailure {
  type: 'Challenging.AcknowledgeFailure';
  processId: string;
  channelId: string;
  reason: FailureReason;
}
export interface AcknowledgeResponse {
  type: 'Challenging.AcknowledgeResponse';
  processId: string;
  channelId: string;
}

export interface WaitForDefund {
  type: 'Challenging.WaitForDefund';
  processId: string;
  channelId: string;
  defundingState: DefundingState;
}

export interface AcknowledgeClosedButNotDefunded {
  type: 'Challenging.AcknowledgeClosedButNotDefunded';
  processId: string;
  channelId: string;
}

export interface AcknowledgeSuccess {
  type: 'Challenging.AcknowledgeSuccess';
  processId: string;
  channelId: string;
}
export interface Failure {
  type: 'Challenging.Failure';
  reason: FailureReason;
}

export interface SuccessOpen {
  type: 'Challenging.SuccessOpen';
}

export interface SuccessClosedAndDefunded {
  type: 'Challenging.SuccessClosedAndDefunded';
}

export interface SuccessClosedButNotDefunded {
  type: 'Challenging.SuccessClosedButNotDefunded';
}

// ------------
// Constructors
// ------------

interface Base {
  processId: string;
  channelId: string;
}
function base<T extends Base>(p: T): Base {
  return {
    processId: p.processId,
    channelId: p.channelId,
  };
}

export const approveChallenge: StateConstructor<ApproveChallenge> = p => {
  return { ...base(p), type: 'Challenging.ApproveChallenge' };
};

export const waitForTransaction: StateConstructor<WaitForTransaction> = p => {
  return {
    ...base(p),
    transactionSubmission: p.transactionSubmission,
    type: 'Challenging.WaitForTransaction',
  };
};

export const waitForResponseOrTimeout: StateConstructor<WaitForResponseOrTimeout> = p => {
  return { ...base(p), expiryTime: p.expiryTime, type: 'Challenging.WaitForResponseOrTimeout' };
};

export const acknowledgeResponse: StateConstructor<AcknowledgeResponse> = p => {
  return { ...base(p), type: 'Challenging.AcknowledgeResponse' };
};

export const acknowledgeTimeout: StateConstructor<AcknowledgeTimeout> = p => {
  return { ...base(p), type: 'Challenging.AcknowledgeTimeout' };
};

export const acknowledgeFailure: StateConstructor<AcknowledgeFailure> = p => {
  return { ...base(p), reason: p.reason, type: 'Challenging.AcknowledgeFailure' };
};

export const waitForDefund: StateConstructor<WaitForDefund> = p => {
  return { ...base(p), defundingState: p.defundingState, type: 'Challenging.WaitForDefund' };
};

export const acknowledgeClosedButNotDefunded: StateConstructor<
  AcknowledgeClosedButNotDefunded
> = p => {
  return { ...base(p), type: 'Challenging.AcknowledgeClosedButNotDefunded' };
};

export const acknowledgeSuccess: StateConstructor<AcknowledgeSuccess> = p => {
  return { ...base(p), type: 'Challenging.AcknowledgeSuccess' };
};

export const failure: StateConstructor<Failure> = p => {
  return { reason: p.reason, type: 'Challenging.Failure' };
};

export const successClosedAndDefunded: StateConstructor<SuccessClosedAndDefunded> = p => {
  return { type: 'Challenging.SuccessClosedAndDefunded' };
};

export const successClosedButNotDefunded: StateConstructor<SuccessClosedButNotDefunded> = p => {
  return { type: 'Challenging.SuccessClosedButNotDefunded' };
};

export const successOpen: StateConstructor<SuccessOpen> = p => {
  return { type: 'Challenging.SuccessOpen' };
};

// -------
// Unions and Guards
// -------

export type ChallengerState = NonTerminalChallengerState | TerminalChallengerState;
export type ChallengerStateType = ChallengerState['type'];

export type NonTerminalChallengerState =
  | ApproveChallenge
  | WaitForTransaction
  | WaitForResponseOrTimeout
  | AcknowledgeTimeout
  | AcknowledgeResponse
  | AcknowledgeFailure
  | WaitForDefund
  | AcknowledgeClosedButNotDefunded
  | AcknowledgeSuccess;

export type TerminalChallengerState =
  | SuccessOpen
  | SuccessClosedAndDefunded
  | SuccessClosedButNotDefunded
  | Failure;

export function isNonTerminalChallengerState(
  state: ProtocolState,
): state is NonTerminalChallengerState {
  return isChallengerState(state) && isNonTerminal(state);
}

export function isChallengerState(state: ProtocolState): state is ChallengerState {
  return (
    state.type === 'Challenging.ApproveChallenge' ||
    state.type === 'Challenging.WaitForTransaction' ||
    state.type === 'Challenging.WaitForResponseOrTimeout' ||
    state.type === 'Challenging.AcknowledgeTimeout' ||
    state.type === 'Challenging.AcknowledgeFailure' ||
    state.type === 'Challenging.AcknowledgeResponse' ||
    state.type === 'Challenging.Failure' ||
    state.type === 'Challenging.SuccessOpen' ||
    state.type === 'Challenging.SuccessClosedAndDefunded' ||
    state.type === 'Challenging.SuccessClosedButNotDefunded' ||
    state.type === 'Challenging.WaitForDefund' ||
    state.type === 'Challenging.AcknowledgeSuccess' ||
    state.type === 'Challenging.AcknowledgeClosedButNotDefunded'
  );
}

export function isTerminal(state: ChallengerState): state is TerminalChallengerState {
  return (
    state.type === 'Challenging.Failure' ||
    state.type === 'Challenging.SuccessOpen' ||
    state.type === 'Challenging.SuccessClosedAndDefunded' ||
    state.type === 'Challenging.SuccessClosedButNotDefunded'
  );
}

export function isNonTerminal(state: ChallengerState): state is NonTerminalChallengerState {
  return !isTerminal(state);
}
