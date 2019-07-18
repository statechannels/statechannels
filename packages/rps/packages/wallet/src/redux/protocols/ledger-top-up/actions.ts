import { CommitmentReceived, WalletAction } from '../../actions';
import { DirectFundingAction } from '../direct-funding';
import { isDirectFundingAction } from '../direct-funding/actions';
import { isCommonAction, EmbeddedProtocol, routerFactory } from '../../../communication';

export type LedgerTopUpAction = CommitmentReceived | DirectFundingAction;

export function isLedgerTopUpAction(action: WalletAction): action is LedgerTopUpAction {
  return isCommonAction(action, EmbeddedProtocol.LedgerTopUp) || isDirectFundingAction(action);
}

export const routesToLedgerTopUp = routerFactory(isLedgerTopUpAction, EmbeddedProtocol.LedgerTopUp);
