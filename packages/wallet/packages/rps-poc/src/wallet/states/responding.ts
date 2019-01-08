import { ChallengeExists, challengeExists } from './shared';

// stage
export const RESPONDING = 'RESPONDING';

// state types
export const ACKNOWLEDGE_CHALLENGE = 'ACKNOWLEDGE_CHALLENGE';
export const CHOOSE_RESPONSE = 'CHOOSE_RESPONSE';
export const TAKE_MOVE_IN_APP = 'TAKE_MOVE_IN_APP';
export const INITIATE_RESPONSE = 'INITIATE_RESPONSE';
export const WAIT_FOR_RESPONSE_CONFIRMATION = 'WAIT_FOR_RESPONSE_CONFIRMATION';
export const WAIT_FOR_RESPONSE_SUBMISSION = 'WAIT_FOR_RESPONSE_SUBMISSION';
export const ACKNOWLEDGE_CHALLENGE_COMPLETE = 'ACKNOWLEDGE_CHALLENGE_COMPLETE';
export interface AcknowledgeChallenge extends ChallengeExists {
  type: typeof ACKNOWLEDGE_CHALLENGE;
  stage: typeof RESPONDING;
}
export function acknowledgeChallenge<T extends ChallengeExists>(params: T): AcknowledgeChallenge {
  return { type: ACKNOWLEDGE_CHALLENGE, stage: RESPONDING, ...challengeExists(params) };
}

export interface ChooseResponse extends ChallengeExists {
  type: typeof CHOOSE_RESPONSE;
  stage: typeof RESPONDING;
}
export function chooseResponse<T extends ChallengeExists>(params: T): ChooseResponse {
  return { type: CHOOSE_RESPONSE, stage: RESPONDING, ...challengeExists(params) };
}
export interface TakeMoveInApp extends ChallengeExists {
  type: typeof TAKE_MOVE_IN_APP;
  stage: typeof RESPONDING;
}
export function takeMoveInApp<T extends ChallengeExists>(params: T): TakeMoveInApp {
  return { type: TAKE_MOVE_IN_APP, stage: RESPONDING, ...challengeExists(params) };
}

export interface InitiateResponse extends ChallengeExists {
  type: typeof INITIATE_RESPONSE;
  stage: typeof RESPONDING;
}
export function initiateResponse<T extends ChallengeExists>(params: T): InitiateResponse {
  return { type: INITIATE_RESPONSE, stage: RESPONDING, ...challengeExists(params) };
}

export interface WaitForResponseSubmission extends ChallengeExists {
  type: typeof WAIT_FOR_RESPONSE_SUBMISSION;
  stage: typeof RESPONDING;
}
export function waitForResponseSubmission<T extends ChallengeExists>(params: T): WaitForResponseSubmission {
  return { type: WAIT_FOR_RESPONSE_SUBMISSION, stage: RESPONDING, ...challengeExists(params) };
}

export interface WaitForResponseConfirmation extends ChallengeExists {
  type: typeof WAIT_FOR_RESPONSE_CONFIRMATION;
  stage: typeof RESPONDING;
}
export function waitForResponseConfirmation<T extends ChallengeExists>(params: T): WaitForResponseConfirmation {
  return { type: WAIT_FOR_RESPONSE_CONFIRMATION, stage: RESPONDING, ...challengeExists(params) };
}

export interface AcknowledgeChallengeComplete extends ChallengeExists {
  type: typeof ACKNOWLEDGE_CHALLENGE_COMPLETE;
  stage: typeof RESPONDING;
}
export function acknowledgeChallengeComplete<T extends ChallengeExists>(params: T): AcknowledgeChallengeComplete {
  return { type: ACKNOWLEDGE_CHALLENGE_COMPLETE, stage: RESPONDING, ...challengeExists(params) };
}

export type RespondingState = (
  | AcknowledgeChallenge
  | ChooseResponse
  | TakeMoveInApp
  | InitiateResponse
  | WaitForResponseSubmission
  | WaitForResponseConfirmation
  | AcknowledgeChallengeComplete
);
