import {MultipleWalletActions, WalletActionType} from "../actions";
import {take, put} from "redux-saga/effects";

export function* multipleActionDispatcher() {
  while (true) {
    const multipleWalletActions: MultipleWalletActions = yield take([
      WalletActionType.WALLET_MULTIPLE_ACTIONS,
      "WALLET.MULTIPLE_RELAYABLE_ACTIONS"
    ]);
    yield multipleWalletActions.actions.map(action => put(action));
  }
}
