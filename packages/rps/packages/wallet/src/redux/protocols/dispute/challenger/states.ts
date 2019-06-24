import { NonTerminalTransactionSubmissionState } from '../../transaction-submission';
import { ProtocolState } from '../..';
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

export interface SuccessClosed {
  type: 'Challenging.SuccessClosed';
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

export const successOpen: StateConstructor<SuccessOpen> = p => {
  return { type: 'Challenging.SuccessOpen' };
};

export const successClosed: StateConstructor<SuccessClosed> = p => {
  return { ...p, type: 'Challenging.SuccessClosed' };
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
  | AcknowledgeFailure;

export type TerminalChallengerState = SuccessOpen | SuccessClosed | Failure;

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
    state.type === 'Challenging.SuccessClosed'
  );
}

export function isTerminal(state: ChallengerState): state is TerminalChallengerState {
  return (
    state.type === 'Challenging.Failure' ||
    state.type === 'Challenging.SuccessOpen' ||
    state.type === 'Challenging.SuccessClosed'
  );
}

export function isNonTerminal(state: ChallengerState): state is NonTerminalChallengerState {
  return !isTerminal(state);
}
