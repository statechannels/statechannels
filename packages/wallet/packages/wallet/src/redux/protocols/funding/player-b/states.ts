import { Properties as P } from '../../../utils';

export type OngoingFundingState =
  | WaitForStrategyProposal
  | WaitForStrategyApproval
  | WaitForFunding
  | WaitForSuccessConfirmation;

export type TerminalFundingState = Success | Failure;
export type FundingState = OngoingFundingState | TerminalFundingState;

export const WAIT_FOR_STRATEGY_PROPOSAL = 'WaitForStrategyProposal';
export const WAIT_FOR_STRATEGY_APPROVAL = 'WaitForStrategyApproval';
export const WAIT_FOR_FUNDING = 'WaitForFunding';
export const WAIT_FOR_SUCCESS_CONFIRMATION = 'WaitForSuccessConfirmation';
export const FAILURE = 'Failure';
export const SUCCESS = 'Success';

export interface WaitForStrategyProposal {
  type: typeof WAIT_FOR_STRATEGY_PROPOSAL;
  targetChannelId: string;
  processId: string;
}

export interface WaitForStrategyApproval {
  type: typeof WAIT_FOR_STRATEGY_APPROVAL;
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

export function isTerminal(state: FundingState): state is Failure | Success {
  return state.type === FAILURE || state.type === SUCCESS;
}

// ------------
// Constructors
// ------------

export function waitForStrategyProposal(p: P<WaitForStrategyProposal>): WaitForStrategyProposal {
  const { processId, targetChannelId } = p;
  return { type: WAIT_FOR_STRATEGY_PROPOSAL, processId, targetChannelId };
}

export function waitForStrategyApproval(p: P<WaitForStrategyApproval>): WaitForStrategyApproval {
  const { processId, targetChannelId } = p;
  return { type: WAIT_FOR_STRATEGY_APPROVAL, processId, targetChannelId };
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
