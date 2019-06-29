import { ProtocolState } from '../..';
import { FundingStrategy } from '..';
import { StateConstructor } from '../../../utils';
import { NonTerminalIndirectFundingState } from '../../indirect-funding';

// -------
// States
// -------
interface BaseState {
  processId: string;
  opponentAddress: string;
  ourAddress: string;
}

export interface WaitForStrategyProposal extends BaseState {
  type: 'Funding.PlayerB.WaitForStrategyProposal';
  targetChannelId: string;
}

export interface WaitForStrategyApproval extends BaseState {
  type: 'Funding.PlayerB.WaitForStrategyApproval';
  targetChannelId: string;
  strategy: FundingStrategy;
}

export interface WaitForFunding extends BaseState {
  type: 'Funding.PlayerB.WaitForFunding';
  fundingState: NonTerminalIndirectFundingState;
  targetChannelId: string;
}

export interface WaitForSuccessConfirmation extends BaseState {
  type: 'Funding.PlayerB.WaitForSuccessConfirmation';
  targetChannelId: string;
}

export interface Failure {
  type: 'Funding.PlayerB.Failure';
  reason: string;
}

export interface Success {
  type: 'Funding.PlayerB.Success';
}

// ------------
// Constructors
// ------------

export const waitForStrategyProposal: StateConstructor<WaitForStrategyProposal> = p => {
  return {
    ...p,
    type: 'Funding.PlayerB.WaitForStrategyProposal',
  };
};

export const waitForStrategyApproval: StateConstructor<WaitForStrategyApproval> = p => {
  return {
    ...p,
    type: 'Funding.PlayerB.WaitForStrategyApproval',
  };
};

export const waitForFunding: StateConstructor<WaitForFunding> = p => {
  return {
    ...p,
    type: 'Funding.PlayerB.WaitForFunding',
  };
};

export const waitForSuccessConfirmation: StateConstructor<WaitForSuccessConfirmation> = p => {
  return {
    ...p,
    type: 'Funding.PlayerB.WaitForSuccessConfirmation',
  };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Funding.PlayerB.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Funding.PlayerB.Failure' };
};

// -------
// Unions and Guards
// -------

export type OngoingFundingState =
  | WaitForStrategyProposal
  | WaitForStrategyApproval
  | WaitForFunding
  | WaitForSuccessConfirmation;

export type TerminalFundingState = Success | Failure;
export type FundingState = OngoingFundingState | TerminalFundingState;

export function isTerminal(state: FundingState): state is Failure | Success {
  return state.type === 'Funding.PlayerB.Failure' || state.type === 'Funding.PlayerB.Success';
}
export function isFundingState(state: ProtocolState): state is FundingState {
  return (
    state.type === 'Funding.PlayerB.WaitForFunding' ||
    state.type === 'Funding.PlayerB.WaitForStrategyApproval' ||
    state.type === 'Funding.PlayerB.WaitForStrategyProposal' ||
    state.type === 'Funding.PlayerB.WaitForSuccessConfirmation' ||
    state.type === 'Funding.PlayerB.Success' ||
    state.type === 'Funding.PlayerB.Failure'
  );
}
