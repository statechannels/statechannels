import { ProtocolState } from '../..';
import { FundingStrategy } from '..';
import { StateConstructor } from '../../../utils';
import { NonTerminalIndirectFundingState } from '../../indirect-funding';
import { AdvanceChannelState } from '../../advance-channel';
import { NonTerminalVirtualFundingState } from '../../virtual-funding/states';

// -------
// States
// -------
interface BaseState {
  processId: string;
  opponentAddress: string;
  ourAddress: string;
}

export interface WaitForStrategyChoice extends BaseState {
  type: 'Funding.PlayerA.WaitForStrategyChoice';
  targetChannelId: string;
}

export interface WaitForStrategyResponse extends BaseState {
  type: 'Funding.PlayerA.WaitForStrategyResponse';
  targetChannelId: string;
  strategy: FundingStrategy;
}

export interface WaitForIndirectFunding extends BaseState {
  type: 'Funding.PlayerA.WaitForIndirectFunding';
  targetChannelId: string;
  fundingState: NonTerminalIndirectFundingState;
  // PostFundSetup state is initialized early to handle post fund setups that arrive before funding is done
  postFundSetupState: AdvanceChannelState;
}

export interface WaitForVirtualFunding extends BaseState {
  type: 'Funding.PlayerA.WaitForVirtualFunding';
  targetChannelId: string;
  fundingState: NonTerminalVirtualFundingState;
  postFundSetupState: AdvanceChannelState;
}

export interface WaitForSuccessConfirmation extends BaseState {
  type: 'Funding.PlayerA.WaitForSuccessConfirmation';
  targetChannelId: string;
}

export interface WaitForPostFundSetup extends BaseState {
  type: 'Funding.PlayerA.WaitForPostFundSetup';
  targetChannelId: string;
  postFundSetupState: AdvanceChannelState;
}

export interface Failure {
  type: 'Funding.PlayerA.Failure';
  reason: string;
}

export interface Success {
  type: 'Funding.PlayerA.Success';
}

// ------------
// Constructors
// ------------

export const waitForStrategyChoice: StateConstructor<WaitForStrategyChoice> = p => {
  return {
    ...p,
    type: 'Funding.PlayerA.WaitForStrategyChoice',
  };
};

export const waitForStrategyResponse: StateConstructor<WaitForStrategyResponse> = p => {
  return {
    ...p,
    type: 'Funding.PlayerA.WaitForStrategyResponse',
  };
};

export const waitForIndirectFunding: StateConstructor<WaitForIndirectFunding> = p => {
  return {
    ...p,
    type: 'Funding.PlayerA.WaitForIndirectFunding',
  };
};

export const waitForVirtualFunding: StateConstructor<WaitForVirtualFunding> = p => {
  return {
    ...p,
    type: 'Funding.PlayerA.WaitForVirtualFunding',
  };
};

export const waitForSuccessConfirmation: StateConstructor<WaitForSuccessConfirmation> = p => {
  return {
    ...p,
    type: 'Funding.PlayerA.WaitForSuccessConfirmation',
  };
};

export const waitForPostFundSetup: StateConstructor<WaitForPostFundSetup> = p => {
  return { ...p, type: 'Funding.PlayerA.WaitForPostFundSetup' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Funding.PlayerA.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'Funding.PlayerA.Failure' };
};

// -------
// Unions and Guards
// -------

export type OngoingFundingState =
  | WaitForStrategyChoice
  | WaitForStrategyResponse
  | WaitForIndirectFunding
  | WaitForVirtualFunding
  | WaitForSuccessConfirmation
  | WaitForPostFundSetup;

export type TerminalFundingState = Success | Failure;
export type FundingState = OngoingFundingState | TerminalFundingState;

export function isFundingState(state: ProtocolState): state is FundingState {
  return (
    state.type === 'Funding.PlayerA.WaitForIndirectFunding' ||
    state.type === 'Funding.PlayerA.WaitForVirtualFunding' ||
    state.type === 'Funding.PlayerA.WaitForStrategyChoice' ||
    state.type === 'Funding.PlayerA.WaitForStrategyResponse' ||
    state.type === 'Funding.PlayerA.WaitForSuccessConfirmation' ||
    state.type === 'Funding.PlayerA.WaitForPostFundSetup' ||
    state.type === 'Funding.PlayerA.Success' ||
    state.type === 'Funding.PlayerA.Failure'
  );
}

export function isTerminal(state: FundingState): state is TerminalFundingState {
  return state.type === 'Funding.PlayerA.Failure' || state.type === 'Funding.PlayerA.Success';
}
