import { ChannelOpen, channelOpen, UserAddressExists, userAddressExists } from '../shared/state';
import { TransactionExists, Properties as Props } from '../../utils';

// stage
export const CLOSING = 'CLOSING';

// state types
export const APPROVE_CONCLUDE = 'APPROVE_CONCLUDE';
export const WAIT_FOR_OPPONENT_CONCLUDE = 'WAIT_FOR_OPPONENT_CONCLUDE';
export const ACKNOWLEDGE_CLOSE_SUCCESS = 'ACKNOWLEDGE_CLOSE_SUCCESS';
export const ACKNOWLEDGE_CLOSED_ON_CHAIN = 'ACKNOWLEDGE_CLOSED_ON_CHAIN';
export const APPROVE_CLOSE_ON_CHAIN = 'APPROVE_CLOSE_ON_CHAIN';
export const WAIT_FOR_CLOSE_INITIATION = 'WAIT_FOR_CLOSE_INITIATION';
export const WAIT_FOR_CLOSE_SUBMISSION = 'WAIT_FOR_CLOSE_SUBMISSION';
export const WAIT_FOR_CLOSE_CONFIRMED = 'WAIT_FOR_CLOSE_CONFIRMED';
export const ACKNOWLEDGE_CONCLUDE = 'ACKNOWLEDGE_CONCLUDE';
export const CLOSE_TRANSACTION_FAILED = 'CLOSE_TRANSACTION_FAILED';

export const FINALIZED = 'FINALIZED'; // when the outcome has been finalized in the adjudicator

export interface CloseTransactionFailed extends UserAddressExists {
  type: typeof CLOSE_TRANSACTION_FAILED;
  stage: typeof CLOSING;
}

export interface AcknowledgeConclude extends ChannelOpen {
  type: typeof ACKNOWLEDGE_CONCLUDE;
  stage: typeof CLOSING;
}

export interface WaitForCloseConfirmed extends ChannelOpen, TransactionExists {
  type: typeof WAIT_FOR_CLOSE_CONFIRMED;
  stage: typeof CLOSING;
}

export interface ApproveConclude extends ChannelOpen {
  type: typeof APPROVE_CONCLUDE;
  stage: typeof CLOSING;
}

export interface WaitForOpponentConclude extends ChannelOpen {
  type: typeof WAIT_FOR_OPPONENT_CONCLUDE;
  stage: typeof CLOSING;
}

export interface AcknowledgeConcludeSuccess extends ChannelOpen {
  type: typeof WAIT_FOR_OPPONENT_CONCLUDE;
  stage: typeof CLOSING;
}

export interface AcknowledgeCloseSuccess extends ChannelOpen {
  type: typeof ACKNOWLEDGE_CLOSE_SUCCESS;
  stage: typeof CLOSING;
}

export interface AcknowledgeClosedOnChain extends ChannelOpen {
  type: typeof ACKNOWLEDGE_CLOSED_ON_CHAIN;
  stage: typeof CLOSING;
}
export interface ApproveCloseOnChain extends ChannelOpen {
  type: typeof APPROVE_CLOSE_ON_CHAIN;
  stage: typeof CLOSING;
}

export interface WaitForCloseInitiation extends UserAddressExists {
  type: typeof WAIT_FOR_CLOSE_INITIATION;
  stage: typeof CLOSING;
}

export interface WaitForCloseSubmission extends UserAddressExists {
  type: typeof WAIT_FOR_CLOSE_SUBMISSION;
  stage: typeof CLOSING;
}

export interface Finalized extends ChannelOpen {
  type: typeof FINALIZED;
  stage: typeof CLOSING;
}

export function approveConclude(params: Props<ApproveConclude>): ApproveConclude {
  return { type: APPROVE_CONCLUDE, stage: CLOSING, ...channelOpen(params) };
}
export function approveCloseOnChain(params: Props<ApproveCloseOnChain>): ApproveCloseOnChain {
  return { type: APPROVE_CLOSE_ON_CHAIN, stage: CLOSING, ...channelOpen(params) };
}

export function waitForOpponentConclude(
  params: Props<WaitForOpponentConclude>,
): WaitForOpponentConclude {
  return { type: WAIT_FOR_OPPONENT_CONCLUDE, stage: CLOSING, ...channelOpen(params) };
}

export function acknowledgeCloseSuccess(
  params: Props<AcknowledgeCloseSuccess>,
): AcknowledgeCloseSuccess {
  return { type: ACKNOWLEDGE_CLOSE_SUCCESS, stage: CLOSING, ...channelOpen(params) };
}

export function acknowledgeClosedOnChain(
  params: Props<AcknowledgeClosedOnChain>,
): AcknowledgeClosedOnChain {
  return { type: ACKNOWLEDGE_CLOSED_ON_CHAIN, stage: CLOSING, ...channelOpen(params) };
}

export function waitForCloseInitiation(
  params: Props<WaitForCloseInitiation>,
): WaitForCloseInitiation {
  return { type: WAIT_FOR_CLOSE_INITIATION, stage: CLOSING, ...userAddressExists(params) };
}

export function waitForCloseSubmission(
  params: Props<WaitForCloseSubmission>,
): WaitForCloseSubmission {
  return { type: WAIT_FOR_CLOSE_SUBMISSION, stage: CLOSING, ...userAddressExists(params) };
}

export function waitForCloseConfirmed(params: Props<WaitForCloseConfirmed>): WaitForCloseConfirmed {
  return {
    type: WAIT_FOR_CLOSE_CONFIRMED,
    stage: CLOSING,
    ...channelOpen(params),
    transactionHash: params.transactionHash,
  };
}

export function acknowledgeConclude(params: Props<AcknowledgeConclude>): AcknowledgeConclude {
  return { type: ACKNOWLEDGE_CONCLUDE, stage: CLOSING, ...channelOpen(params) };
}

export function closeTransactionFailed(
  params: Props<CloseTransactionFailed>,
): CloseTransactionFailed {
  return { type: CLOSE_TRANSACTION_FAILED, stage: CLOSING, ...userAddressExists(params) };
}

export function finalized(params: Props<Finalized>): Finalized {
  return { type: FINALIZED, stage: CLOSING, ...channelOpen(params) };
}

export type ClosingState =
  | ApproveConclude
  | WaitForOpponentConclude
  | AcknowledgeClosedOnChain
  | AcknowledgeCloseSuccess
  | ApproveCloseOnChain
  | WaitForCloseInitiation
  | WaitForCloseSubmission
  | WaitForCloseConfirmed
  | AcknowledgeConclude
  | CloseTransactionFailed
  | Finalized;
