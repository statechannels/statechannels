import { WalletAction } from '../../actions';
import { WithdrawalAction, isWithdrawalAction } from '../withdrawing/actions';
import { LedgerDefundingAction, isLedgerDefundingAction } from '../ledger-defunding/actions';
import { VirtualDefundingAction, isVirtualDefundingAction } from '../virtual-defunding';
import { EmbeddedProtocol, routerFactory } from '../../../communication';

// -------
// Actions
// -------

// -------
// Constructors
// -------

// -------
// Unions and Guards
// -------

export type DefundingAction = WithdrawalAction | LedgerDefundingAction | VirtualDefundingAction;

export const isDefundingAction = (action: WalletAction): action is DefundingAction => {
  return (
    isWithdrawalAction(action) ||
    isLedgerDefundingAction(action) ||
    isVirtualDefundingAction(action)
  );
};

export const routesToDefunding = routerFactory(isDefundingAction, EmbeddedProtocol.Defunding);
