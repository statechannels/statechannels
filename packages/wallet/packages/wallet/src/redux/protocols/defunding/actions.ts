import { WalletAction } from '../../actions';
import { WithdrawalAction, isWithdrawalAction } from '../withdrawing/actions';
import { IndirectDefundingAction, isIndirectDefundingAction } from '../indirect-defunding/actions';
import { VirtualDefundingAction, isVirtualDefundingAction } from '../virtual-defunding';

// -------
// Actions
// -------

// -------
// Constructors
// -------

// -------
// Unions and Guards
// -------

// TODO: Replace once ledger defunding actions are defined
export type DefundingAction = WithdrawalAction | IndirectDefundingAction | VirtualDefundingAction;

export const isDefundingAction = (action: WalletAction): action is DefundingAction => {
  return (
    isWithdrawalAction(action) ||
    isIndirectDefundingAction(action) ||
    isVirtualDefundingAction(action)
  );
};
