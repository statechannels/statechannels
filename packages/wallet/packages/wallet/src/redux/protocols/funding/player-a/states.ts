import { Properties as P } from '../../../utils';
import { ProtocolState } from '../..';
import { FundingStrategy } from '..';
import { NonTerminalIndirectFundingState } from '../../indirect-funding/state';

export type OngoingFundingState =
  | WaitForStrategyChoice
  | WaitForStrategyResponse
  | WaitForFunding
  | WaitForSuccessConfirmation;

export type TerminalFundingState = Success | Failure;
export type FundingState = OngoingFundingState | TerminalFundingState;

export const WAIT_FOR_STRATEGY_CHOICE = 'IndirectFunding.PlayerA.WaitForStrategyChoice';
export const WAIT_FOR_STRATEGY_RESPONSE = 'IndirectFunding.PlayerA.WaitForStrategyResponse';
export const WAIT_FOR_FUNDING = 'IndirectFunding.PlayerA.WaitForFunding';
export const WAIT_FOR_SUCCESS_CONFIRMATION = 'IndirectFunding.PlayerA.WaitForSuccessConfirmation';
export const FAILURE = 'IndirectFunding.PlayerA.Failure';
export const SUCCESS = 'IndirectFunding.PlayerA.Success';

interface BaseState {
  processId: string;
  opponentAddress: string;
}

export interface WaitForStrategyChoice extends BaseState {
  type: typeof WAIT_FOR_STRATEGY_CHOICE;
  targetChannelId: string;
}

export interface WaitForStrategyResponse extends BaseState {
  type: typeof WAIT_FOR_STRATEGY_RESPONSE;
  targetChannelId: string;
  strategy: FundingStrategy;
}

export interface WaitForFunding extends BaseState {
  type: typeof WAIT_FOR_FUNDING;
  targetChannelId: string;
  // TODO: Currently we are limited to indirect funding
  // In the future this could support other funding states
  fundingState: NonTerminalIndirectFundingState;
}

export interface WaitForSuccessConfirmation extends BaseState {
  type: typeof WAIT_FOR_SUCCESS_CONFIRMATION;
  targetChannelId: string;
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

export function isFundingState(state: ProtocolState): state is FundingState {
  return (
    state.type === WAIT_FOR_FUNDING ||
    state.type === WAIT_FOR_STRATEGY_CHOICE ||
    state.type === WAIT_FOR_STRATEGY_RESPONSE ||
    state.type === WAIT_FOR_SUCCESS_CONFIRMATION ||
    state.type === SUCCESS ||
    state.type === FAILURE
  );
}

export function isTerminal(state: FundingState): state is TerminalFundingState {
  return state.type === FAILURE || state.type === SUCCESS;
}

// ------------
// Constructors
// ------------

export function waitForStrategyChoice(p: P<WaitForStrategyChoice>): WaitForStrategyChoice {
  const { processId, opponentAddress, targetChannelId } = p;
  return { type: WAIT_FOR_STRATEGY_CHOICE, processId, targetChannelId, opponentAddress };
}

export function waitForStrategyResponse(p: P<WaitForStrategyResponse>): WaitForStrategyResponse {
  const { processId, opponentAddress, targetChannelId, strategy } = p;
  return {
    type: WAIT_FOR_STRATEGY_RESPONSE,
    processId,
    opponentAddress,
    targetChannelId,
    strategy,
  };
}

export function waitForFunding(p: P<WaitForFunding>): WaitForFunding {
  const { processId, opponentAddress, fundingState, targetChannelId } = p;
  return { type: WAIT_FOR_FUNDING, processId, opponentAddress, fundingState, targetChannelId };
}

export function waitForSuccessConfirmation(
  p: P<WaitForSuccessConfirmation>,
): WaitForSuccessConfirmation {
  const { processId, opponentAddress, targetChannelId } = p;
  return { type: WAIT_FOR_SUCCESS_CONFIRMATION, processId, opponentAddress, targetChannelId };
}

export function success(): Success {
  return { type: SUCCESS };
}

export function failure(reason: string): Failure {
  return { type: FAILURE, reason };
}
