import {put, call} from "redux-saga/effects";

import jrs from "jsonrpc-lite";

import {displayMessageSent} from "../../actions";
import {validateNotification} from "../../../json-rpc-validation/validator";

export function* displaySender(displayMessage: "Show" | "Hide") {
  const showWallet = displayMessage === "Show";

  const message = jrs.notification("UIUpdate", {showWallet});
  yield validateNotification(message);
  yield call([window.parent, window.parent.postMessage], message, "*");
  yield put(displayMessageSent({}));
}
