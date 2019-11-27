import {WalletAction} from "../../actions";
import {isCommonAction, EmbeddedProtocol} from "../../../communication";
import {routerFactory} from "../../../communication/actions";
import {isDirectFundingAction, DirectFundingAction} from "../direct-funding/actions";
import {AdvanceChannelAction, isAdvanceChannelAction} from "../advance-channel";

// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------

export type NewLedgerChannelAction = AdvanceChannelAction | DirectFundingAction;
export function isNewLedgerChannelAction(action: WalletAction): action is NewLedgerChannelAction {
  return (
    isCommonAction(action, EmbeddedProtocol.NewLedgerChannel) ||
    isDirectFundingAction(action) ||
    isAdvanceChannelAction(action)
  );
}

export const routesToNewLedgerChannel = routerFactory(
  isNewLedgerChannelAction,
  EmbeddedProtocol.NewLedgerChannel
);
