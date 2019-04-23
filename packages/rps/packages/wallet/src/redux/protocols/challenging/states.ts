import { Properties as P } from '../../utils';
import { NonTerminalTransactionSubmissionState } from '../transaction-submission';

export type ChallengingState = NonTerminalState | TerminalState;
export type ChallengingStateType = ChallengingState['type'];

export type NonTerminalState =
  | ApproveChallenge
  | WaitForTransaction
  | WaitForResponseOrTimeout
  | AcknowledgeTimeout
  | AcknowledgeResponse
  | AcknowledgeFailure;

export type TerminalState = SuccessOpen | SuccessClosed | Failure;

export type FailureReason =
  | 'ChannelDoesntExist'
  | 'NotFullyOpen'
  | 'DeclinedByUser'
  | 'AlreadyHaveLatest'
  | 'LatestWhileApproving'
  | 'TransactionFailed';

export interface ApproveChallenge {
  type: 'ApproveChallenge';
  processId: string;
  channelId: string;
}

export interface WaitForTransaction {
  type: 'WaitForTransaction';
  processId: string;
  channelId: string;
  transactionSubmission: NonTerminalTransactionSubmissionState;
}

export interface WaitForResponseOrTimeout {
  type: 'WaitForResponseOrTimeout';
  processId: string;
  channelId: string;
}

export interface AcknowledgeTimeout {
  type: 'AcknowledgeTimeout';
  processId: string;
  channelId: string;
}

export interface AcknowledgeFailure {
  type: 'AcknowledgeFailure';
  processId: string;
  channelId: string;
  reason: FailureReason;
}
export interface AcknowledgeResponse {
  type: 'AcknowledgeResponse';
  processId: string;
  channelId: string;
}
export interface Failure {
  type: 'Failure';
  reason: FailureReason;
}

export interface SuccessOpen {
  type: 'SuccessOpen';
}

export interface SuccessClosed {
  type: 'SuccessClosed';
}

// -------
// Helpers
// -------

export function isTerminal(state: ChallengingState): state is TerminalState {
  return state.type === 'Failure' || state.type === 'SuccessOpen' || state.type === 'SuccessClosed';
}

export function isNonTerminal(state: ChallengingState): state is NonTerminalState {
  return (
    state.type === 'ApproveChallenge' ||
    state.type === 'WaitForTransaction' ||
    state.type === 'WaitForResponseOrTimeout' ||
    state.type === 'AcknowledgeTimeout' ||
    state.type === 'AcknowledgeFailure' ||
    state.type === 'AcknowledgeResponse'
  );
}

// --------
// Creators
// --------

export function approveChallenge(p: P<ApproveChallenge>): ApproveChallenge {
  const { processId, channelId } = p;
  return { type: 'ApproveChallenge', processId, channelId };
}

export function waitForTransaction(p: P<WaitForTransaction>): WaitForTransaction {
  const { processId, channelId, transactionSubmission } = p;
  return { type: 'WaitForTransaction', processId, channelId, transactionSubmission };
}

export function waitForResponseOrTimeout(p: P<WaitForResponseOrTimeout>): WaitForResponseOrTimeout {
  const { processId, channelId } = p;
  return { type: 'WaitForResponseOrTimeout', processId, channelId };
}

export function acknowledgeResponse(p: P<AcknowledgeResponse>): AcknowledgeResponse {
  const { processId, channelId } = p;
  return { type: 'AcknowledgeResponse', processId, channelId };
}

export function acknowledgeTimeout(p: P<AcknowledgeTimeout>): AcknowledgeTimeout {
  const { processId, channelId } = p;
  return { type: 'AcknowledgeTimeout', processId, channelId };
}

export function acknowledgeFailure(p: P<AcknowledgeFailure>): AcknowledgeFailure {
  const { processId, channelId, reason } = p;
  return { type: 'AcknowledgeFailure', processId, channelId, reason };
}

export function failure(p: P<Failure>): Failure {
  const { reason } = p;
  return { type: 'Failure', reason };
}

export function successClosed(): SuccessClosed {
  return { type: 'SuccessClosed' };
}

export function successOpen(): SuccessOpen {
  return { type: 'SuccessOpen' };
}
