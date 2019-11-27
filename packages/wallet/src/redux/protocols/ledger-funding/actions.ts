import {NewLedgerChannelAction, isNewLedgerChannelAction} from "../new-ledger-channel/actions";
import {
  ExistingLedgerFundingAction,
  isExistingLedgerFundingAction
} from "../existing-ledger-funding";
import {WalletAction} from "../../actions";
import {EmbeddedProtocol} from "../../../communication";
import {routerFactory} from "../../../communication/actions";

export type LedgerFundingAction = NewLedgerChannelAction | ExistingLedgerFundingAction;

export const isLedgerFundingAction = (action: WalletAction): action is LedgerFundingAction => {
  return isNewLedgerChannelAction(action) || isExistingLedgerFundingAction(action);
};

export const routesToLedgerFunding = routerFactory(
  isLedgerFundingAction,
  EmbeddedProtocol.LedgerFunding
);
