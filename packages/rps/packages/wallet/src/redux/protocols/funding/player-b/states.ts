import { Properties as P } from '../../../utils';
import { Strategy } from '..';

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

interface BaseState {
  processId: string;
  opponentAddress: string;
}

export interface WaitForStrategyProposal extends BaseState {
  type: typeof WAIT_FOR_STRATEGY_PROPOSAL;
  targetChannelId: string;
}

export interface WaitForStrategyApproval extends BaseState {
  type: typeof WAIT_FOR_STRATEGY_APPROVAL;
  targetChannelId: string;
  strategy: Strategy;
}

export interface WaitForFunding extends BaseState {
  type: typeof WAIT_FOR_FUNDING;
  fundingState: 'funding state';
}

export interface WaitForSuccessConfirmation extends BaseState {
  type: typeof WAIT_FOR_SUCCESS_CONFIRMATION;
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
  const { processId, opponentAddress, targetChannelId } = p;
  return { type: WAIT_FOR_STRATEGY_PROPOSAL, processId, opponentAddress, targetChannelId };
}

export function waitForStrategyApproval(p: P<WaitForStrategyApproval>): WaitForStrategyApproval {
  const { processId, opponentAddress, targetChannelId, strategy } = p;
  return {
    type: WAIT_FOR_STRATEGY_APPROVAL,
    processId,
    opponentAddress,
    targetChannelId,
    strategy,
  };
}

export function waitForFunding(p: P<WaitForFunding>): WaitForFunding {
  const { processId, opponentAddress, fundingState } = p;
  return { type: WAIT_FOR_FUNDING, processId, opponentAddress, fundingState };
}

export function waitForSuccessConfirmation(
  p: P<WaitForSuccessConfirmation>,
): WaitForSuccessConfirmation {
  const { processId, opponentAddress } = p;
  return { type: WAIT_FOR_SUCCESS_CONFIRMATION, processId, opponentAddress };
}

export function success(): Success {
  return { type: SUCCESS };
}

export function failure(reason: string): Failure {
  return { type: FAILURE, reason };
}
