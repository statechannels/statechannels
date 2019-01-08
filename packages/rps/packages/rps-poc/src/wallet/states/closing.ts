import { AdjudicatorExists, adjudicatorExists, ChannelOpen, channelOpen, AdjudicatorMightExist, adjudicatorMightExist, } from './shared';

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

export interface WaitForCloseConfirmed extends AdjudicatorExists {
  type: typeof WAIT_FOR_CLOSE_CONFIRMED;
  stage: typeof CLOSING;
}

export interface ApproveConclude extends AdjudicatorMightExist {
  type: typeof APPROVE_CONCLUDE;
  stage: typeof CLOSING;
}

export interface WaitForOpponentConclude extends AdjudicatorMightExist {
  type: typeof WAIT_FOR_OPPONENT_CONCLUDE;
  stage: typeof CLOSING;
}

export interface AcknowledgeConcludeSuccess extends AdjudicatorMightExist {
  type: typeof WAIT_FOR_OPPONENT_CONCLUDE;
  stage: typeof CLOSING;
}


export interface AcknowledgeCloseSuccess extends ChannelOpen {
  type: typeof ACKNOWLEDGE_CLOSE_SUCCESS;
  stage: typeof CLOSING;
}

export interface AcknowledgeClosedOnChain extends AdjudicatorExists {
  type: typeof ACKNOWLEDGE_CLOSED_ON_CHAIN;
  stage: typeof CLOSING;
}
export interface ApproveCloseOnChain extends AdjudicatorExists {
  type: typeof APPROVE_CLOSE_ON_CHAIN;
  stage: typeof CLOSING;
}

export interface WaitForCloseInitiation extends AdjudicatorExists {
  type: typeof WAIT_FOR_CLOSE_INITIATION;
  stage: typeof CLOSING;
}

export interface WaitForCloseSubmission extends AdjudicatorExists {
  type: typeof WAIT_FOR_CLOSE_SUBMISSION;
  stage: typeof CLOSING;
}
export function approveConclude<T extends AdjudicatorMightExist>(params: T): ApproveConclude {
  return { type: APPROVE_CONCLUDE, stage: CLOSING, ...adjudicatorMightExist(params) };
}
export function approveCloseOnChain<T extends AdjudicatorExists>(params: T): ApproveCloseOnChain {
  return { type: APPROVE_CLOSE_ON_CHAIN, stage: CLOSING, ...adjudicatorExists(params) };
}

export function waitForOpponentConclude<T extends AdjudicatorMightExist>(params: T): WaitForOpponentConclude {
  return { type: WAIT_FOR_OPPONENT_CONCLUDE, stage: CLOSING, ...adjudicatorMightExist(params) };
}

export function acknowledgeCloseSuccess<T extends ChannelOpen>(params: T): AcknowledgeCloseSuccess {
  return { type: ACKNOWLEDGE_CLOSE_SUCCESS, stage: CLOSING, ...channelOpen(params) };
}

export function acknowledgeClosedOnChain<T extends AdjudicatorExists>(params: T): AcknowledgeClosedOnChain {
  return { type: ACKNOWLEDGE_CLOSED_ON_CHAIN, stage: CLOSING, ...adjudicatorExists(params) };
}

export function waitForCloseInitiation<T extends AdjudicatorExists>(params: T): WaitForCloseInitiation {
  return { type: WAIT_FOR_CLOSE_INITIATION, stage: CLOSING, ...adjudicatorExists(params) };
}

export function waitForCloseSubmission<T extends AdjudicatorExists>(params: T): WaitForCloseSubmission {
  return { type: WAIT_FOR_CLOSE_SUBMISSION, stage: CLOSING, ...adjudicatorExists(params) };
}

export function waitForCloseConfirmed<T extends AdjudicatorExists>(params: T): WaitForCloseConfirmed {
  return { type: WAIT_FOR_CLOSE_CONFIRMED, stage: CLOSING, ...adjudicatorExists(params) };
}


export type ClosingState = (
  | ApproveConclude
  | WaitForOpponentConclude
  | AcknowledgeClosedOnChain
  | AcknowledgeCloseSuccess
  | ApproveCloseOnChain
  | WaitForCloseInitiation
  | WaitForCloseSubmission
  | WaitForCloseConfirmed
);
