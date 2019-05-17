import { NonTerminalTransactionSubmissionState as NonTerminalTSState } from '../../transaction-submission/states';
import { Properties } from '../../../utils';
import { Commitment } from '../../../../domain';
import { ProtocolState } from '../..';
import { DefundingState } from '../../defunding';

export type ResponderState =
  | NonTerminalResponderState
  | Success
  | ClosedAndDefunded
  | ClosedButNotDefunded
  | Failure;

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
export const enum FailureReason {
  TransactionFailure = 'Transaction failed',
}

export const WAIT_FOR_APPROVAL = 'Responding.WaitForApproval';
export const WAIT_FOR_TRANSACTION = 'Responding.WaitForTransaction';
export const WAIT_FOR_ACKNOWLEDGEMENT = 'Responding.WaitForAcknowledgement';
export const WAIT_FOR_RESPONSE = 'Responding.WaitForResponse';
export const ACKNOWLEDGE_TIMEOUT = 'Responding.AcknowledgeTimeout';
export const WAIT_FOR_DEFUND = 'Responding.WaitForDefund';
export const ACKNOWLEDGE_DEFUNDING_SUCCESS = 'Responding.AcknowledgeDefundingSuccess';
export const ACKNOWLEDGE_CLOSED_BUT_NOT_DEFUNDED = 'Responding.AcknowledgeClosedButNotDefunded';
export const CLOSED_AND_DEFUNDED = 'Responding.ClosedAndDefunded';
export const CLOSED_BUT_NOT_DEFUNDED = 'Responding.ClosedButNotDefunded';
export const FAILURE = 'Responding.Failure';
export const SUCCESS = 'Responding.Success';

export interface WaitForApproval {
  type: typeof WAIT_FOR_APPROVAL;
  processId: string;
  channelId: string;
  challengeCommitment: Commitment;
}

export interface WaitForTransaction {
  type: typeof WAIT_FOR_TRANSACTION;
  processId: string;
  channelId: string;
  transactionSubmissionState: NonTerminalTSState;
}
export interface WaitForAcknowledgement {
  type: typeof WAIT_FOR_ACKNOWLEDGEMENT;
  processId: string;
  channelId: string;
}

export interface WaitForResponse {
  type: typeof WAIT_FOR_RESPONSE;
  processId: string;
  channelId: string;
}

export interface AcknowledgeTimeout {
  type: typeof ACKNOWLEDGE_TIMEOUT;
  processId: string;
  channelId: string;
}

export interface WaitForDefund {
  type: typeof WAIT_FOR_DEFUND;
  processId: string;
  defundingState: DefundingState;
  channelId: string;
}

export interface AcknowledgeDefundingSuccess {
  type: typeof ACKNOWLEDGE_DEFUNDING_SUCCESS;
  processId: string;
  channelId: string;
}

export interface AcknowledgeClosedButNotDefunded {
  type: typeof ACKNOWLEDGE_CLOSED_BUT_NOT_DEFUNDED;
  processId: string;
  channelId: string;
}
export interface Failure {
  type: typeof FAILURE;
  reason: string;
}

export interface ClosedAndDefunded {
  type: typeof CLOSED_AND_DEFUNDED;
}

export interface ClosedButNotDefunded {
  type: typeof CLOSED_BUT_NOT_DEFUNDED;
}

export interface Success {
  type: typeof SUCCESS;
}

// -------
// Helpers
// -------

export function isResponderState(state: ProtocolState): state is ResponderState {
  return (
    state.type === WAIT_FOR_APPROVAL ||
    state.type === WAIT_FOR_TRANSACTION ||
    state.type === WAIT_FOR_ACKNOWLEDGEMENT ||
    state.type === WAIT_FOR_RESPONSE ||
    state.type === ACKNOWLEDGE_TIMEOUT ||
    state.type === WAIT_FOR_DEFUND ||
    state.type === ACKNOWLEDGE_DEFUNDING_SUCCESS ||
    state.type === ACKNOWLEDGE_CLOSED_BUT_NOT_DEFUNDED ||
    state.type === FAILURE ||
    state.type === CLOSED_AND_DEFUNDED ||
    state.type === CLOSED_BUT_NOT_DEFUNDED ||
    state.type === SUCCESS
  );
}

export function isNonTerminalResponderState(
  state: ProtocolState,
): state is NonTerminalResponderState {
  return isResponderState(state) && !isTerminal(state);
}

export function isTerminal(state: ResponderState): state is TerminalResponderState {
  return (
    state.type === CLOSED_AND_DEFUNDED ||
    state.type === FAILURE ||
    state.type === SUCCESS ||
    state.type === CLOSED_BUT_NOT_DEFUNDED
  );
}

// -------
// Constructors
// -------

export function waitForApproval(properties: Properties<WaitForApproval>): WaitForApproval {
  const { processId, challengeCommitment, channelId } = properties;
  return { type: WAIT_FOR_APPROVAL, processId, channelId, challengeCommitment };
}

export function waitForTransaction(properties: Properties<WaitForTransaction>): WaitForTransaction {
  const { processId, transactionSubmissionState, channelId } = properties;
  return {
    type: WAIT_FOR_TRANSACTION,
    transactionSubmissionState,
    processId,
    channelId,
  };
}

export function waitForAcknowledgement(
  properties: Properties<WaitForAcknowledgement>,
): WaitForAcknowledgement {
  const { processId, channelId } = properties;
  return { type: WAIT_FOR_ACKNOWLEDGEMENT, processId, channelId };
}

export function waitForResponse(properties: Properties<WaitForResponse>): WaitForResponse {
  const { processId, channelId } = properties;
  return { type: WAIT_FOR_RESPONSE, processId, channelId };
}

export function acknowledgeTimeout(properties: Properties<AcknowledgeTimeout>): AcknowledgeTimeout {
  const { processId, channelId } = properties;
  return { type: ACKNOWLEDGE_TIMEOUT, processId, channelId };
}

export function waitForDefund(properties: Properties<WaitForDefund>): WaitForDefund {
  const { processId, defundingState, channelId } = properties;
  return { type: WAIT_FOR_DEFUND, processId, defundingState, channelId };
}

export function acknowledgeDefundingSuccess(
  properties: Properties<AcknowledgeDefundingSuccess>,
): AcknowledgeDefundingSuccess {
  const { processId, channelId } = properties;
  return { type: ACKNOWLEDGE_DEFUNDING_SUCCESS, processId, channelId };
}

export function acknowledgeClosedButNotDefunded(
  properties: Properties<AcknowledgeClosedButNotDefunded>,
): AcknowledgeClosedButNotDefunded {
  const { processId, channelId } = properties;
  return { type: ACKNOWLEDGE_CLOSED_BUT_NOT_DEFUNDED, processId, channelId };
}

export function success(): Success {
  return { type: SUCCESS };
}

export function failure(reason: FailureReason): Failure {
  return { type: FAILURE, reason };
}

export function closedAndDefunded(): ClosedAndDefunded {
  return { type: CLOSED_AND_DEFUNDED };
}
export function closedButNotDefunded(): ClosedButNotDefunded {
  return { type: CLOSED_BUT_NOT_DEFUNDED };
}
