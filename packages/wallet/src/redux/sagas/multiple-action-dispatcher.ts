import {take, put} from "redux-saga/effects";

import {MultipleWalletActions} from "../actions";

export function* multipleActionDispatcher() {
  while (true) {
    const multipleWalletActions: MultipleWalletActions = yield take([
      "WALLET.MULTIPLE_ACTIONS",
      "WALLET.MULTIPLE_RELAYABLE_ACTIONS"
    ]);
    yield multipleWalletActions.actions.map(action => put(action));
  }
}
