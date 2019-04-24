import { Properties as P } from '../../../utils';

export type OngoingFundingState =
  | WaitForStrategyChoice
  | WaitForStrategyResponse
  | WaitForFunding
  | WaitForSuccessConfirmation;

export type TerminalFundingState = Success | Failure;
export type FundingState = OngoingFundingState | TerminalFundingState;

export const WAIT_FOR_STRATEGY_CHOICE = 'WaitForStrategyChoice';
export const WAIT_FOR_STRATEGY_RESPONSE = 'WaitForStrategyResponse';
export const WAIT_FOR_FUNDING = 'WaitForFunding';
export const WAIT_FOR_SUCCESS_CONFIRMATION = 'WaitForSuccessConfirmation';
export const FAILURE = 'Failure';
export const SUCCESS = 'Success';

export interface WaitForStrategyChoice {
  type: typeof WAIT_FOR_STRATEGY_CHOICE;
  targetChannelId: string;
  processId: string;
}

export interface WaitForStrategyResponse {
  type: typeof WAIT_FOR_STRATEGY_RESPONSE;
  targetChannelId: string;
  processId: string;
}

export interface WaitForFunding {
  type: typeof WAIT_FOR_FUNDING;
  processId: string;
  fundingState: 'funding state';
}

export interface WaitForSuccessConfirmation {
  type: typeof WAIT_FOR_SUCCESS_CONFIRMATION;
  processId: string;
}

export interface Failure {
  type: typeof FAILURE;
  reason: string;
}

export interface Success {
  type: typeof SUCCESS;
}

// -------
// Helpers
// -------

export function isTerminal(state: FundingState): state is TerminalFundingState {
  return state.type === FAILURE || state.type === SUCCESS;
}

// ------------
// Constructors
// ------------

export function waitForStrategyChoice(p: P<WaitForStrategyChoice>): WaitForStrategyChoice {
  const { processId, targetChannelId } = p;
  return { type: WAIT_FOR_STRATEGY_CHOICE, processId, targetChannelId };
}

export function waitForStrategyResponse(p: P<WaitForStrategyResponse>): WaitForStrategyResponse {
  const { processId, targetChannelId } = p;
  return { type: WAIT_FOR_STRATEGY_RESPONSE, processId, targetChannelId };
}

export function waitForFunding(p: P<WaitForFunding>): WaitForFunding {
  const { processId, fundingState } = p;
  return { type: WAIT_FOR_FUNDING, processId, fundingState };
}

export function waitForSuccessConfirmation(
  p: P<WaitForSuccessConfirmation>,
): WaitForSuccessConfirmation {
  const { processId } = p;
  return { type: WAIT_FOR_SUCCESS_CONFIRMATION, processId };
}

export function success(): Success {
  return { type: SUCCESS };
}

export function failure(reason: string): Failure {
  return { type: FAILURE, reason };
}
