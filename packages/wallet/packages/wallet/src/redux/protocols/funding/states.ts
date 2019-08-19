import { ProtocolState } from '..';

import { StateConstructor } from '../../utils';
import { NonTerminalLedgerFundingState } from '../ledger-funding';
import { AdvanceChannelState } from '../advance-channel';
import { NonTerminalVirtualFundingState } from '../virtual-funding/states';
import { OngoingFundingStrategyNegotiationState } from '../funding-strategy-negotiation';

// -------
// States
// -------
interface BaseState {
  processId: string;
  opponentAddress: string;
  ourAddress: string;
}

export interface WaitForStrategyNegotiation extends BaseState {
  type: 'Funding.WaitForStrategyNegotiation';
  targetChannelId: string;
  fundingStrategyNegotiationState: OngoingFundingStrategyNegotiationState;
}

export interface WaitForLedgerFunding extends BaseState {
  type: 'Funding.WaitForLedgerFunding';
  targetChannelId: string;
  fundingState: NonTerminalLedgerFundingState;
  // PostFundSetup state is initialized early to handle post fund setups that arrive before funding is done
  postFundSetupState: AdvanceChannelState;
}

export interface WaitForVirtualFunding extends BaseState {
  type: 'Funding.WaitForVirtualFunding';
  targetChannelId: string;
  fundingState: NonTerminalVirtualFundingState;
  postFundSetupState: AdvanceChannelState;
}

export interface WaitForSuccessConfirmation extends BaseState {
  type: 'Funding.WaitForSuccessConfirmation';
  targetChannelId: string;
}

export interface WaitForPostFundSetup extends BaseState {
  type: 'Funding.WaitForPostFundSetup';
  targetChannelId: string;
  postFundSetupState: AdvanceChannelState;
}

export interface Failure {
  type: 'Funding.Failure';
  reason: string;
}

export interface Success {
  type: 'Funding.Success';
}

// ------------
// Constructors
// ------------

export const waitForStrategyNegotiation: StateConstructor<WaitForStrategyNegotiation> = p => {
  return {
    ...p,
    type: 'Funding.WaitForStrategyNegotiation',
  };
};

export const waitForLedgerFunding: StateConstructor<WaitForLedgerFunding> = p => {
  return {
    ...p,
    type: 'Funding.WaitForLedgerFunding',
  };
};

export const waitForVirtualFunding: StateConstructor<WaitForVirtualFunding> = p => {
  return {
    ...p,
    type: 'Funding.WaitForVirtualFunding',
  };
};

export const waitForSuccessConfirmation: StateConstructor<WaitForSuccessConfirmation> = p => {
  return {
    ...p,
    type: 'Funding.WaitForSuccessConfirmation',
  };
};

export const waitForPostFundSetup: StateConstructor<WaitForPostFundSetup> = p => {
  return { ...p, type: 'Funding.WaitForPostFundSetup' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Funding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Funding.Failure' };
};

// -------
// Unions and Guards
// -------

export type OngoingFundingState =
  | WaitForStrategyNegotiation
  | WaitForLedgerFunding
  | WaitForVirtualFunding
  | WaitForSuccessConfirmation
  | WaitForPostFundSetup;

export type TerminalFundingState = Success | Failure;
export type FundingState = OngoingFundingState | TerminalFundingState;
export type FundingStateType = FundingState['type'];
export function isFundingState(state: ProtocolState): state is FundingState {
  return (
    state.type === 'Funding.WaitForLedgerFunding' ||
    state.type === 'Funding.WaitForVirtualFunding' ||
    state.type === 'Funding.WaitForStrategyNegotiation' ||
    state.type === 'Funding.WaitForSuccessConfirmation' ||
    state.type === 'Funding.WaitForPostFundSetup' ||
    state.type === 'Funding.Success' ||
    state.type === 'Funding.Failure'
  );
}

export function isTerminalFundingState(state: FundingState): state is TerminalFundingState {
  return state.type === 'Funding.Failure' || state.type === 'Funding.Success';
}

export function isOngoingFundingState(state: FundingState): state is OngoingFundingState {
  return !isTerminalFundingState(state);
}
