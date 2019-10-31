import {BaseProcessAction} from "../actions";
import {TransactionAction} from "../transaction-submission/actions";
import {EngineAction, isTransactionAction} from "../../actions";
import {ActionConstructor} from "../../utils";

// -------
// Actions
// -------
export interface WithdrawalApproved extends BaseProcessAction {
  type: "ENGINE.WITHDRAWING.WITHDRAWAL_APPROVED";
  processId: string;
  withdrawalAddress: string;
}

export interface WithdrawalRejected extends BaseProcessAction {
  type: "ENGINE.WITHDRAWING.WITHDRAWAL_REJECTED";
  processId: string;
}
export interface WithdrawalSuccessAcknowledged extends BaseProcessAction {
  type: "ENGINE.WITHDRAWING.WITHDRAWAL_SUCCESS_ACKNOWLEDGED";
  processId: string;
}

// -------
// Constructors
// -------

export const withdrawalApproved: ActionConstructor<WithdrawalApproved> = p => ({
  ...p,
  type: "ENGINE.WITHDRAWING.WITHDRAWAL_APPROVED"
});

export const withdrawalRejected: ActionConstructor<WithdrawalRejected> = p => ({
  ...p,
  type: "ENGINE.WITHDRAWING.WITHDRAWAL_REJECTED"
});

export const withdrawalSuccessAcknowledged: ActionConstructor<WithdrawalSuccessAcknowledged> = p => ({
  ...p,
  type: "ENGINE.WITHDRAWING.WITHDRAWAL_SUCCESS_ACKNOWLEDGED"
});

// -------
// Types and Guards
// -------
export type WithdrawalAction =
  | WithdrawalApproved
  | WithdrawalRejected
  | WithdrawalSuccessAcknowledged
  | TransactionAction;

export const isWithdrawalAction = (action: EngineAction): action is WithdrawalAction => {
  return (
    isTransactionAction(action) ||
    action.type === "ENGINE.WITHDRAWING.WITHDRAWAL_APPROVED" ||
    action.type === "ENGINE.WITHDRAWING.WITHDRAWAL_SUCCESS_ACKNOWLEDGED" ||
    action.type === "ENGINE.WITHDRAWING.WITHDRAWAL_REJECTED"
  );
};
