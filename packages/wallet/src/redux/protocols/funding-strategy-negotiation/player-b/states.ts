import { ProtocolState } from '../..';
import { StateConstructor } from '../../../utils';
import { ProtocolLocator, FundingStrategy } from '../../../../communication';

// -------
// States
// -------
interface BaseState {
  processId: string;
  opponentAddress: string;
  ourAddress: string;
  protocolLocator: ProtocolLocator;
}

export interface WaitForStrategyProposal extends BaseState {
  type: 'FundingStrategyNegotiation.PlayerB.WaitForStrategyProposal';
  targetChannelId: string;
}

export interface WaitForStrategyApproval extends BaseState {
  type: 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval';
  targetChannelId: string;
  strategy: FundingStrategy;
}

export interface Failure {
  type: 'FundingStrategyNegotiation.PlayerB.Failure';
  reason: string;
}

export interface Success {
  type: 'FundingStrategyNegotiation.PlayerB.Success';
  selectedFundingStrategy: FundingStrategy;
}

// ------------
// Constructors
// ------------

export const waitForStrategyProposal: StateConstructor<WaitForStrategyProposal> = p => {
  return {
    ...p,
    type: 'FundingStrategyNegotiation.PlayerB.WaitForStrategyProposal',
  };
};

export const waitForStrategyApproval: StateConstructor<WaitForStrategyApproval> = p => {
  return {
    ...p,
    type: 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval',
  };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'FundingStrategyNegotiation.PlayerB.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'FundingStrategyNegotiation.PlayerB.Failure' };
};

// -------
// Unions and Guards
// -------

export type OngoingFundingStrategyNegotiationState =
  | WaitForStrategyProposal
  | WaitForStrategyApproval;
export type TerminalFundingStrategyNegotiationState = Success | Failure;
export type FundingStrategyNegotiationState =
  | OngoingFundingStrategyNegotiationState
  | TerminalFundingStrategyNegotiationState;

export function isTerminal(state: FundingStrategyNegotiationState): state is Failure | Success {
  return (
    state.type === 'FundingStrategyNegotiation.PlayerB.Failure' ||
    state.type === 'FundingStrategyNegotiation.PlayerB.Success'
  );
}
export function isFundingStrategyNegotiationState(
  state: ProtocolState,
): state is FundingStrategyNegotiationState {
  return state.type.indexOf('FundingStrategyNegotiation.PlayerB') === 0;
}
