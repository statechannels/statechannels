import { WithdrawalAction } from '../withdrawing/actions';
import { TransactionConfirmed } from '../transaction-submission/actions';
// TODO: Replace once ledger defunding actions are defined
type LedgerDefundingAction = TransactionConfirmed;
export type DefundingAction = WithdrawalAction | LedgerDefundingAction;
