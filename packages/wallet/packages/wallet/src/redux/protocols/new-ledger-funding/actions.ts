import * as playerA from './player-a/actions';
import * as playerB from './player-b/actions';
import { CommonAction, WalletAction, isCommonAction } from '../../actions';
import { isDirectFundingAction } from '../direct-funding/actions';

// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------

export { playerA, playerB };
export type ProcessAction = playerA.Action | playerB.Action;
export type NewLedgerFundingAction = ProcessAction | CommonAction;

export function isNewLedgerFundingAction(action: WalletAction): action is NewLedgerFundingAction {
  return (
    isCommonAction(action) ||
    isDirectFundingAction(action) ||
    action.type.indexOf('WALLET.NEW_LEDGER_FUNDING') === 0
  );
}
