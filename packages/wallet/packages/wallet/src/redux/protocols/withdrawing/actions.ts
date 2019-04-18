import { BaseProcessAction } from '../actions';
import { TransactionAction } from '../transaction-submission/actions';

export const WITHDRAWAL_APPROVED = 'WALLET.WITHDRAWAL_APPROVED';
export const WITHDRAWAL_SUCCESS_ACKNOWLEDGED = 'WITHDRAWAL_SUCCESS_ACKNOWLEDGED';
export const WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED';

export type WithdrawalAction =
  | WithdrawalApproved
  | WithdrawalRejected
  | WithdrawalSuccessAcknowledged
  | TransactionAction;

export interface WithdrawalApproved extends BaseProcessAction {
  type: typeof WITHDRAWAL_APPROVED;
  processId: string;
  withdrawalAddress: string;
}

export interface WithdrawalRejected extends BaseProcessAction {
  type: typeof WITHDRAWAL_REJECTED;
  processId: string;
}
export interface WithdrawalSuccessAcknowledged extends BaseProcessAction {
  type: typeof WITHDRAWAL_SUCCESS_ACKNOWLEDGED;
  processId: string;
}

export const withdrawalApproved = (
  processId: string,
  withdrawalAddress: string,
): WithdrawalApproved => ({
  type: WITHDRAWAL_APPROVED as typeof WITHDRAWAL_APPROVED,
  withdrawalAddress,
  processId,
});

export const withdrawalRejected = (processId: string): WithdrawalRejected => ({
  type: WITHDRAWAL_REJECTED as typeof WITHDRAWAL_REJECTED,
  processId,
});

export const withdrawalSuccessAcknowledged = (
  processId: string,
): WithdrawalSuccessAcknowledged => ({
  type: WITHDRAWAL_SUCCESS_ACKNOWLEDGED as typeof WITHDRAWAL_SUCCESS_ACKNOWLEDGED,
  processId,
});
