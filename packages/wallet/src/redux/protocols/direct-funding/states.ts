import { NonTerminalTransactionSubmissionState } from '../transaction-submission/states';
import { Properties, StateConstructor } from '../../utils';
import { ProtocolState } from '..';
import { TwoPartyPlayerIndex } from '../../types';
import { ProtocolLocator } from '../../../communication';

// -------
// States
// -------

// Funding status

export type ChannelFundingStatus =
  | 'DirectFunding.NotSafeToDeposit'
  | 'DirectFunding.WaitForDepositTransaction'
  | 'DirectFunding.WaitForFunding'
  | 'DirectFunding.WaitForDepositTransaction'
  | 'DirectFunding.FundingSuccess'
  | 'DirectFunding.FundingFailure';

export const DIRECT_FUNDING = 'FUNDING_TYPE.DIRECT';

export interface BaseDirectFundingState {
  processId: string;
  safeToDepositLevel: string;
  totalFundingRequired: string;
  requiredDeposit: string;
  channelId: string;
  ourIndex: TwoPartyPlayerIndex;
  protocolLocator: ProtocolLocator;
}

export interface NotSafeToDeposit extends BaseDirectFundingState {
  type: 'DirectFunding.NotSafeToDeposit';
}

export interface WaitForDepositTransaction extends BaseDirectFundingState {
  type: 'DirectFunding.WaitForDepositTransaction';
  transactionSubmissionState: NonTerminalTransactionSubmissionState;
  funded: boolean;
}
export interface WaitForFunding extends BaseDirectFundingState {
  type: 'DirectFunding.WaitForFunding';
}
export interface FundingSuccess extends BaseDirectFundingState {
  type: 'DirectFunding.FundingSuccess';
}

export interface FundingFailure extends BaseDirectFundingState {
  type: 'DirectFunding.FundingFailure';
}

// ------------
// Constructors
// ------------

export const baseDirectFundingState: StateConstructor<BaseDirectFundingState> = params => {
  return { ...params };
};

export const notSafeToDeposit: StateConstructor<NotSafeToDeposit> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'DirectFunding.NotSafeToDeposit',
  };
};

export function waitForDepositTransaction(
  params: Properties<WaitForDepositTransaction>,
): WaitForDepositTransaction {
  return {
    ...baseDirectFundingState(params),
    ...params,
    type: 'DirectFunding.WaitForDepositTransaction',
  };
}
export const waitForFunding: StateConstructor<WaitForFunding> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'DirectFunding.WaitForFunding',
  };
};

export const fundingSuccess: StateConstructor<FundingSuccess> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'DirectFunding.FundingSuccess',
  };
};

export const fundingFailure: StateConstructor<FundingFailure> = params => {
  return {
    ...baseDirectFundingState(params),
    type: 'DirectFunding.FundingFailure',
  };
};

// -------
// Unions and Guards
// -------

export type NonTerminalDirectFundingState =
  | NotSafeToDeposit
  | WaitForDepositTransaction
  | WaitForFunding;

export type DirectFundingState = NonTerminalDirectFundingState | FundingSuccess | FundingFailure;

export type DirectFundingStateType = DirectFundingState['type'];

export function isTerminal(state: DirectFundingState): state is FundingFailure | FundingSuccess {
  return (
    state.type === 'DirectFunding.FundingFailure' || state.type === 'DirectFunding.FundingSuccess'
  );
}

export function isDirectFundingState(state: ProtocolState): state is DirectFundingState {
  return (
    state.type === 'DirectFunding.NotSafeToDeposit' ||
    state.type === 'DirectFunding.WaitForDepositTransaction' ||
    state.type === 'DirectFunding.WaitForFunding' ||
    state.type === 'DirectFunding.FundingFailure' ||
    state.type === 'DirectFunding.FundingSuccess'
  );
}

export function isSuccess(state: DirectFundingState): state is FundingSuccess {
  return state.type === 'DirectFunding.FundingSuccess';
}

export function isFailure(state: DirectFundingState): state is FundingFailure {
  return state.type === 'DirectFunding.FundingFailure';
}
