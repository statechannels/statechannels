import { WalletAction } from '../../actions';
import { isCommonAction, EmbeddedProtocol, routerFactory } from '../../../communication';
import { isDirectFundingAction, DirectFundingAction } from '../direct-funding/actions';
import { AdvanceChannelAction, isAdvanceChannelAction } from '../advance-channel';

// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------

export type NewLedgerFundingAction = AdvanceChannelAction | DirectFundingAction;
export function isNewLedgerFundingAction(action: WalletAction): action is NewLedgerFundingAction {
  return (
    isCommonAction(action, EmbeddedProtocol.NewLedgerFunding) ||
    isDirectFundingAction(action) ||
    isAdvanceChannelAction(action)
  );
}

export const routesToNewLedgerFunding = routerFactory(
  isNewLedgerFundingAction,
  EmbeddedProtocol.NewLedgerFunding,
);
