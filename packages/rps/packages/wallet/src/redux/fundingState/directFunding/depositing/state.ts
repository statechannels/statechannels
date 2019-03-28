import { BaseDirectFundingState, SAFE_TO_DEPOSIT, baseDirectFundingState } from '../state';
import { TransactionExists } from '../../../shared/state';

// Deposit status
export const WAIT_FOR_TRANSACTION_SENT = 'WAIT_FOR_TRANSACTION_SENT';
export const WAIT_FOR_DEPOSIT_APPROVAL = 'WAIT_FOR_DEPOSIT_APPROVAL';
export const WAIT_FOR_DEPOSIT_CONFIRMATION = 'WAIT_FOR_DEPOSIT_CONFIRMATION';
export const DEPOSIT_TRANSACTION_FAILED = 'DEPOSIT_TRANSACTION_FAILED';
export const DEPOSIT_CONFIRMED = 'DEPOSIT_CONFIRMED';

export type DepositStatus =
  | typeof WAIT_FOR_TRANSACTION_SENT
  | typeof WAIT_FOR_DEPOSIT_APPROVAL
  | typeof WAIT_FOR_DEPOSIT_CONFIRMATION
  | typeof DEPOSIT_TRANSACTION_FAILED
  | typeof DEPOSIT_CONFIRMED;

interface BaseWithTransaction extends BaseDirectFundingState, TransactionExists {}

export interface WaitForTransactionSent extends BaseDirectFundingState {
  depositStatus: typeof WAIT_FOR_TRANSACTION_SENT;
  channelFundingStatus: typeof SAFE_TO_DEPOSIT;
}

export interface WaitForDepositApproval extends BaseDirectFundingState {
  depositStatus: typeof WAIT_FOR_DEPOSIT_APPROVAL;
  channelFundingStatus: typeof SAFE_TO_DEPOSIT;
}

export interface WaitForDepositConfirmation extends BaseDirectFundingState, TransactionExists {
  depositStatus: typeof WAIT_FOR_DEPOSIT_CONFIRMATION;
  channelFundingStatus: typeof SAFE_TO_DEPOSIT;
}
export interface DepositTransactionFailed extends BaseDirectFundingState {
  depositStatus: typeof DEPOSIT_TRANSACTION_FAILED;
  channelFundingStatus: typeof SAFE_TO_DEPOSIT;
}
export type Depositing =
  | WaitForTransactionSent
  | WaitForDepositApproval
  | WaitForDepositConfirmation
  | DepositTransactionFailed;

// Depositing phase
export function waitForTransactionSent<T extends BaseDirectFundingState>(
  params: T,
): WaitForTransactionSent {
  return {
    ...baseDirectFundingState(params),
    depositStatus: WAIT_FOR_TRANSACTION_SENT,
    channelFundingStatus: SAFE_TO_DEPOSIT,
  };
}

export function waitForDepositApproval<T extends BaseDirectFundingState>(
  params: T,
): WaitForDepositApproval {
  return {
    ...baseDirectFundingState(params),
    depositStatus: WAIT_FOR_DEPOSIT_APPROVAL,
    channelFundingStatus: SAFE_TO_DEPOSIT,
  };
}
export function waitForDepositConfirmation<T extends BaseWithTransaction>(
  params: T,
): WaitForDepositConfirmation {
  return {
    ...baseDirectFundingState(params),
    depositStatus: WAIT_FOR_DEPOSIT_CONFIRMATION,
    channelFundingStatus: SAFE_TO_DEPOSIT,
    transactionHash: params.transactionHash,
  };
}
export function depositTransactionFailed<T extends BaseDirectFundingState>(
  params: T,
): DepositTransactionFailed {
  return {
    ...baseDirectFundingState(params),
    depositStatus: DEPOSIT_TRANSACTION_FAILED,
    channelFundingStatus: SAFE_TO_DEPOSIT,
  };
}
