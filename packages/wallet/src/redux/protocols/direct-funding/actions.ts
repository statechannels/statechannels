import * as actions from "../../actions";
import {isCommonAction, EmbeddedProtocol, SignedStatesReceived} from "../../../communication";
import {routerFactory} from "../../../communication/actions";

// -------
// Actions
// -------

// -------
// Constructors
// -------
// -------
// Unions and Guards
// -------

type EmbeddedAction = actions.advanceChannel.AdvanceChannelAction | actions.TransactionAction;

export type DirectFundingAction = SignedStatesReceived | actions.DepositedEvent | EmbeddedAction;

function isEmbeddedAction(action: actions.WalletAction): action is EmbeddedAction {
  return (
    actions.advanceChannel.isAdvanceChannelAction(action) || actions.isTransactionAction(action)
  );
}

export function isDirectFundingAction(action: actions.WalletAction): action is DirectFundingAction {
  return (
    action.type === "WALLET.ASSET_HOLDER.DEPOSITED" ||
    isCommonAction(action, EmbeddedProtocol.DirectFunding) ||
    isEmbeddedAction(action)
  );
}

export const routesToDirectFunding = routerFactory(
  isDirectFundingAction,
  EmbeddedProtocol.DirectFunding
);
