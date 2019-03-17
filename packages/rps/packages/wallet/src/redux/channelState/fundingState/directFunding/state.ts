import { SharedDirectFundingState } from '../shared/state';
import { TransactionExists } from '../../shared/state';

// state types
export const WAIT_FOR_FUNDING_APPROVAL = 'WAIT_FOR_FUNDING_APPROVAL';

export const A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK =
  'A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK';
export const A_SUBMIT_DEPOSIT_IN_METAMASK = 'A_SUBMIT_DEPOSIT_IN_METAMASK';
export const A_WAIT_FOR_DEPOSIT_CONFIRMATION = 'A_WAIT_FOR_DEPOSIT_CONFIRMATION';
export const A_WAIT_FOR_OPPONENT_DEPOSIT = 'A_WAIT_FOR_OPPONENT_DEPOSIT';
export const A_DEPOSIT_TRANSACTION_FAILED = 'A_DEPOSIT_TRANSACTION_FAILED';

export const B_WAIT_FOR_OPPONENT_DEPOSIT = 'B_WAIT_FOR_OPPONENT_DEPOSIT';

export const B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK =
  'B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK';
export const B_SUBMIT_DEPOSIT_IN_METAMASK = 'B_SUBMIT_DEPOSIT_IN_METAMASK';
export const B_WAIT_FOR_DEPOSIT_CONFIRMATION = 'B_WAIT_FOR_DEPOSIT_CONFIRMATION';
export const B_DEPOSIT_TRANSACTION_FAILED = 'B_DEPOSIT_TRANSACTION_FAILED';

export const FUNDING_CONFIRMED = 'FUNDING_CONFIRMED';

export const DIRECT_FUNDING = 'FUNDING_TYPE.DIRECT';
export interface WaitForFundingApproval extends SharedDirectFundingState {
  type: typeof WAIT_FOR_FUNDING_APPROVAL;
}

export interface AWaitForDepositToBeSentToMetaMask extends SharedDirectFundingState {
  type: typeof A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK;
}

export interface ASubmitDepositInMetaMask extends SharedDirectFundingState {
  type: typeof A_SUBMIT_DEPOSIT_IN_METAMASK;
}

export interface AWaitForDepositConfirmation extends SharedDirectFundingState, TransactionExists {
  type: typeof A_WAIT_FOR_DEPOSIT_CONFIRMATION;
}

export interface ADepositTransactionFailed extends SharedDirectFundingState {
  type: typeof A_DEPOSIT_TRANSACTION_FAILED;
}

export interface AWaitForOpponentDeposit extends SharedDirectFundingState {
  type: typeof A_WAIT_FOR_OPPONENT_DEPOSIT;
}

export interface BWaitForOpponentDeposit extends SharedDirectFundingState {
  type: typeof B_WAIT_FOR_OPPONENT_DEPOSIT;
}

export interface BWaitForDepositToBeSentToMetaMask extends SharedDirectFundingState {
  type: typeof B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK;
}

export interface BSubmitDepositInMetaMask extends SharedDirectFundingState {
  type: typeof B_SUBMIT_DEPOSIT_IN_METAMASK;
}

export interface BWaitForDepositConfirmation extends SharedDirectFundingState, TransactionExists {
  type: typeof B_WAIT_FOR_DEPOSIT_CONFIRMATION;
}
export interface BDepositTransactionFailed extends SharedDirectFundingState {
  type: typeof B_DEPOSIT_TRANSACTION_FAILED;
}

export interface FundingConfirmed extends SharedDirectFundingState {
  type: typeof FUNDING_CONFIRMED;
}

export function directFundingState<T extends SharedDirectFundingState>(
  params: T,
): SharedDirectFundingState {
  const { requestedTotalFunds, requestedYourContribution, channelId } = params;
  return { fundingType: DIRECT_FUNDING, requestedTotalFunds, requestedYourContribution, channelId };
}

export function waitForFundingApproval<T extends SharedDirectFundingState>(
  params: T,
): WaitForFundingApproval {
  return {
    type: WAIT_FOR_FUNDING_APPROVAL,
    ...directFundingState(params),
  };
}

export function aWaitForDepositToBeSentToMetaMask<T extends SharedDirectFundingState>(
  params: T,
): AWaitForDepositToBeSentToMetaMask {
  return {
    type: A_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK,
    ...directFundingState(params),
  };
}

export function aSubmitDepositInMetaMask<T extends SharedDirectFundingState>(
  params: T,
): ASubmitDepositInMetaMask {
  return { type: A_SUBMIT_DEPOSIT_IN_METAMASK, ...directFundingState(params) };
}

export function aWaitForDepositConfirmation<T extends SharedDirectFundingState & TransactionExists>(
  params: T,
): AWaitForDepositConfirmation {
  return {
    type: A_WAIT_FOR_DEPOSIT_CONFIRMATION,
    ...directFundingState(params),
    transactionHash: params.transactionHash,
  };
}

export function aDepositTransactionFailed<T extends SharedDirectFundingState>(
  params: T,
): ADepositTransactionFailed {
  return { type: A_DEPOSIT_TRANSACTION_FAILED, ...directFundingState(params) };
}

export function aWaitForOpponentDeposit<T extends SharedDirectFundingState>(
  params: T,
): AWaitForOpponentDeposit {
  return { type: A_WAIT_FOR_OPPONENT_DEPOSIT, ...directFundingState(params) };
}

export function bWaitForOpponentDeposit<T extends SharedDirectFundingState>(
  params: T,
): BWaitForOpponentDeposit {
  return {
    type: B_WAIT_FOR_OPPONENT_DEPOSIT,
    fundingType: DIRECT_FUNDING,
    ...directFundingState(params),
  };
}
export function bWaitForDepositToBeSentToMetaMask<T extends SharedDirectFundingState>(
  params: T,
): BWaitForDepositToBeSentToMetaMask {
  return {
    type: B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK,
    ...directFundingState(params),
  };
}

export function bSubmitDepositInMetaMask<T extends SharedDirectFundingState>(
  params: T,
): BSubmitDepositInMetaMask {
  return { type: B_SUBMIT_DEPOSIT_IN_METAMASK, ...directFundingState(params) };
}

export function bWaitForDepositConfirmation<T extends SharedDirectFundingState & TransactionExists>(
  params: T,
): BWaitForDepositConfirmation {
  return {
    type: B_WAIT_FOR_DEPOSIT_CONFIRMATION,
    ...directFundingState(params),
    transactionHash: params.transactionHash,
  };
}

export function bDepositTransactionFailed<T extends SharedDirectFundingState>(
  params: T,
): BDepositTransactionFailed {
  return { type: B_DEPOSIT_TRANSACTION_FAILED, ...directFundingState(params) };
}

export function fundingConfirmed<T extends SharedDirectFundingState>(params: T): FundingConfirmed {
  return { type: FUNDING_CONFIRMED, ...directFundingState(params) };
}

export type DirectFundingState =
  | WaitForFundingApproval
  | AWaitForDepositToBeSentToMetaMask
  | ASubmitDepositInMetaMask
  | AWaitForDepositConfirmation
  | BWaitForDepositToBeSentToMetaMask
  | BSubmitDepositInMetaMask
  | AWaitForOpponentDeposit
  | BWaitForOpponentDeposit
  | BWaitForDepositConfirmation
  | ADepositTransactionFailed
  | BDepositTransactionFailed
  | FundingConfirmed;
