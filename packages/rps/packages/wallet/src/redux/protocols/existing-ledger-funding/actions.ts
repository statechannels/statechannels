import { CommitmentReceived, WalletAction } from '../../actions';
import { LedgerTopUpAction, isLedgerTopUpAction } from '../ledger-top-up/actions';
import { isCommonAction, EmbeddedProtocol, routerFactory } from '../../../communication';

export type ExistingLedgerFundingAction = CommitmentReceived | LedgerTopUpAction;

export function isExistingLedgerFundingAction(
  action: WalletAction,
): action is ExistingLedgerFundingAction {
  return (
    isCommonAction(action, EmbeddedProtocol.ExistingLedgerFunding) || isLedgerTopUpAction(action)
  );
}

export const routestoExistingLedgerFunding = routerFactory(
  isExistingLedgerFundingAction,
  EmbeddedProtocol.ExistingLedgerFunding,
);
