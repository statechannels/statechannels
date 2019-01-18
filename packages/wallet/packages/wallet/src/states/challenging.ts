import {
  AdjudicatorExists, adjudicatorExists, ChallengeExists, challengeExists
} from './shared';
import { TransactionRequest } from 'ethers/providers';
export const CHALLENGING = 'CHALLENGING';

export const APPROVE_CHALLENGE = "APPROVE_CHALLENGE";
export const WAIT_FOR_CHALLENGE_INITIATION = 'INITIATE_CHALLENGE';
export const WAIT_FOR_CHALLENGE_SUBMISSION = 'WAIT_FOR_CHALLENGE_SUBMISSION';
export const WAIT_FOR_CHALLENGE_CONFIRMATION = 'WAIT_FOR_CHALLENGE_CONFIRMATION';

export const WAIT_FOR_RESPONSE_OR_TIMEOUT = 'WAIT_FOR_RESPONSE_OR_TIMEOUT';
export const ACKNOWLEDGE_CHALLENGE_RESPONSE = 'ACKNOWLEDGE_CHALLENGE_RESPONSE';
export const ACKNOWLEDGE_CHALLENGE_TIMEOUT = 'ACKNOWLEDGE_CHALLENGE_TIMEOUT';

export interface ApproveChallenge extends AdjudicatorExists {
  type: typeof APPROVE_CHALLENGE;
  stage: typeof CHALLENGING;
}

export function approveChallenge<T extends AdjudicatorExists>(params: T): ApproveChallenge {
  return {
    type: APPROVE_CHALLENGE,
    stage: CHALLENGING,
    ...adjudicatorExists(params),
  };
}

export interface WaitForChallengeInitiation extends AdjudicatorExists {
  type: typeof WAIT_FOR_CHALLENGE_INITIATION;
  stage: typeof CHALLENGING;
}
export function waitForChallengeInitiation<T extends AdjudicatorExists>(transaction: TransactionRequest, params: T): WaitForChallengeInitiation {
  return {
    type: WAIT_FOR_CHALLENGE_INITIATION,
    stage: CHALLENGING,
    ...adjudicatorExists(params),
    transactionOutbox: transaction,
  };
}

export interface WaitForChallengeSubmission extends AdjudicatorExists {
  type: typeof WAIT_FOR_CHALLENGE_SUBMISSION;
  stage: typeof CHALLENGING;
}
export function waitForChallengeSubmission<T extends AdjudicatorExists>(params: T): WaitForChallengeSubmission {
  return {
    type: WAIT_FOR_CHALLENGE_SUBMISSION,
    stage: CHALLENGING,
    ...adjudicatorExists(params),
  };
}


export interface WaitForChallengeConfirmation extends ChallengeExists {
  type: typeof WAIT_FOR_CHALLENGE_CONFIRMATION;
  stage: typeof CHALLENGING;
}
export function waitForChallengeConfirmation<T extends ChallengeExists>(params: T): WaitForChallengeConfirmation {
  return {
    type: WAIT_FOR_CHALLENGE_CONFIRMATION,
    stage: CHALLENGING,
    ...challengeExists(params),
  };
}

export interface WaitForResponseOrTimeout extends ChallengeExists {
  type: typeof WAIT_FOR_RESPONSE_OR_TIMEOUT;
  stage: typeof CHALLENGING;
}

export function waitForResponseOrTimeout<T extends ChallengeExists>(params: T): WaitForResponseOrTimeout {
  return {
    type: WAIT_FOR_RESPONSE_OR_TIMEOUT,
    stage: CHALLENGING,
    ...challengeExists(params),
  };
}

export interface AcknowledgeChallengeResponse extends ChallengeExists {
  type: typeof ACKNOWLEDGE_CHALLENGE_RESPONSE;
  stage: typeof CHALLENGING;
}


export function acknowledgeChallengeResponse<T extends ChallengeExists>(params: T): AcknowledgeChallengeResponse {
  return {
    type: ACKNOWLEDGE_CHALLENGE_RESPONSE,
    stage: CHALLENGING,
    ...challengeExists(params),
  };
}

export interface AcknowledgeChallengeTimeout extends ChallengeExists {
  type: typeof ACKNOWLEDGE_CHALLENGE_TIMEOUT;
  stage: typeof CHALLENGING;
}

export function acknowledgeChallengeTimeout<T extends ChallengeExists>(params: T): AcknowledgeChallengeTimeout {
  return {
    type: ACKNOWLEDGE_CHALLENGE_TIMEOUT,
    stage: CHALLENGING,
    ...challengeExists(params),
  };
}

export type ChallengingState = (
  | WaitForChallengeInitiation
  | WaitForChallengeSubmission
  | WaitForChallengeConfirmation
  | WaitForResponseOrTimeout
  | AcknowledgeChallengeResponse
  | AcknowledgeChallengeTimeout
  | ApproveChallenge
);
