import {MultipleEngineActions} from "../actions";
import {take, put} from "redux-saga/effects";

export function* multipleActionDispatcher() {
  while (true) {
    const multipleEngineActions: MultipleEngineActions = yield take([
      "ENGINE.MULTIPLE_ACTIONS",
      "ENGINE.MULTIPLE_RELAYABLE_ACTIONS"
    ]);
    yield multipleEngineActions.actions.map(action => put(action));
  }
}
