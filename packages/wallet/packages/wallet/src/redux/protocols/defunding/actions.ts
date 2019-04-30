import { WalletAction } from '../../actions';
import {
  WithdrawalAction,
  WITHDRAWAL_APPROVED,
  WITHDRAWAL_REJECTED,
  WITHDRAWAL_SUCCESS_ACKNOWLEDGED,
} from '../withdrawing/actions';
import { TransactionConfirmed, TRANSACTION_CONFIRMED } from '../transaction-submission/actions';
// TODO: Replace once ledger defunding actions are defined
type LedgerDefundingAction = TransactionConfirmed;
export type DefundingAction = WithdrawalAction | LedgerDefundingAction;

export const isDefundingAction = (action: WalletAction): action is DefundingAction => {
  return (
    action.type === WITHDRAWAL_APPROVED ||
    action.type === WITHDRAWAL_SUCCESS_ACKNOWLEDGED ||
    action.type === WITHDRAWAL_REJECTED ||
    action.type === TRANSACTION_CONFIRMED
  );
};
