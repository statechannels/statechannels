import { CommitmentReceived, WalletAction } from '../../actions';
import { DirectFundingAction } from '../direct-funding';
import { isDirectFundingAction } from '../direct-funding/actions';
import { LEDGER_TOP_UP_PROTOCOL_LOCATOR } from './reducer';

export type LedgerTopUpAction = CommitmentReceived | DirectFundingAction;

export function isLedgerTopUpAction(action: WalletAction): action is LedgerTopUpAction {
  return (
    (action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' &&
      action.protocolLocator === LEDGER_TOP_UP_PROTOCOL_LOCATOR) ||
    isDirectFundingAction(action)
  );
}
