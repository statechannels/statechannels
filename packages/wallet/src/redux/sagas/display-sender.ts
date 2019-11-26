import {put} from "redux-saga/effects";
import {displayMessageSent} from "../actions";

export function* displaySender(displayMessage) {
  console.log(`The wallet wants to ${displayMessage} itself`);
  yield put(displayMessageSent({}));
}
