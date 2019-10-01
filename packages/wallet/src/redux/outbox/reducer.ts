import {OutboxState} from "./state";
import {WalletAction, WalletActionType} from "../actions";

export function clearOutbox(state: OutboxState, action: WalletAction): OutboxState {
  const nextOutbox = {...state};
  if (action.type === WalletActionType.WALLET_MESSAGE_SENT) {
    nextOutbox.messageOutbox = nextOutbox.messageOutbox.slice(1);
  }
  if (action.type === WalletActionType.WALLET_DISPLAY_MESSAGE_SENT) {
    nextOutbox.displayOutbox = nextOutbox.displayOutbox.slice(1);
  }
  if (action.type === "WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT") {
    nextOutbox.transactionOutbox = nextOutbox.transactionOutbox.slice(1);
  }

  return nextOutbox;
}
