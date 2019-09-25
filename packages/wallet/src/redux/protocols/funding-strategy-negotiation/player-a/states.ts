import { ProtocolState } from '../..';
import { StateConstructor } from '../../../utils';
import { FundingStrategy, ProtocolLocator } from '../../../../communication';

// -------
// States
// -------
interface BaseState {
  processId: string;
  opponentAddress: string;
  ourAddress: string;
  protocolLocator: ProtocolLocator;
}

export interface WaitForStrategyChoice extends BaseState {
  type: 'FundingStrategyNegotiation.PlayerA.WaitForStrategyChoice';
  targetChannelId: string;
}

export interface WaitForStrategyResponse extends BaseState {
  type: 'FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse';
  targetChannelId: string;
  strategy: FundingStrategy;
}

export interface Failure {
  type: 'FundingStrategyNegotiation.PlayerA.Failure';
  reason: string;
}

export interface Success {
  type: 'FundingStrategyNegotiation.PlayerA.Success';
  selectedFundingStrategy: FundingStrategy;
}

// ------------
// Constructors
// ------------

export const waitForStrategyChoice: StateConstructor<WaitForStrategyChoice> = p => {
  return {
    ...p,
    type: 'FundingStrategyNegotiation.PlayerA.WaitForStrategyChoice',
  };
};

export const waitForStrategyResponse: StateConstructor<WaitForStrategyResponse> = p => {
  return {
    ...p,
    type: 'FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse',
  };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'FundingStrategyNegotiation.PlayerA.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'FundingStrategyNegotiation.PlayerA.Failure' };
};

// -------
// Unions and Guards
// -------

export type OngoingFundingStrategyNegotiationState =
  | WaitForStrategyChoice
  | WaitForStrategyResponse;

export type TerminalFundingStrategyNegotiationState = Success | Failure;
export type FundingStrategyNegotiationState =
  | OngoingFundingStrategyNegotiationState
  | TerminalFundingStrategyNegotiationState;

export function isFundingStrategyNegotiationState(
  state: ProtocolState,
): state is FundingStrategyNegotiationState {
  return state.type.indexOf('FundingStrategyNegotiation.PlayerA') === 0;
}

export function isTerminal(
  state: FundingStrategyNegotiationState,
): state is TerminalFundingStrategyNegotiationState {
  return (
    state.type === 'FundingStrategyNegotiation.PlayerA.Failure' ||
    state.type === 'FundingStrategyNegotiation.PlayerA.Success'
  );
}
