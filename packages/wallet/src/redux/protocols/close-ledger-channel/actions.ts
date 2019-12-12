import {WalletAction} from "../../actions";
import {WithdrawalAction, isWithdrawalAction} from "../withdrawing/actions";
import {AdvanceChannelAction, isAdvanceChannelAction} from "../advance-channel";
import {ProtocolLocator, BaseProcessAction} from "../../../communication";
import {ActionConstructor} from "../../utils";

// -------
// Actions
// -------
export interface ClearedToSend extends BaseProcessAction {
  type: "WALLET.CLOSE_LEDGER_CHANNEL.CLEARED_TO_SEND";
  protocolLocator: ProtocolLocator;
}

// -------
// Constructors
// -------
export const clearedToSend: ActionConstructor<ClearedToSend> = p => {
  const {processId, protocolLocator} = p;
  return {
    type: "WALLET.CLOSE_LEDGER_CHANNEL.CLEARED_TO_SEND",
    processId,
    protocolLocator
  };
};
// -------
// Unions and Guards
// -------

export type CloseLedgerChannelAction = WithdrawalAction | AdvanceChannelAction | ClearedToSend;

export const isCloseLedgerChannelAction = (
  action: WalletAction
): action is CloseLedgerChannelAction => {
  return (
    isWithdrawalAction(action) ||
    isAdvanceChannelAction(action) ||
    action.type === "WALLET.CLOSE_LEDGER_CHANNEL.CLEARED_TO_SEND"
  );
};
