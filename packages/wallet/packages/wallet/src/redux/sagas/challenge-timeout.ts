import { take, put } from 'redux-saga/effects';
import * as actions from "../actions";
import { delay } from 'redux-saga';

export default function* challengeTimeout() {
  while (true) {
    const action: actions.ChallengeCreatedEvent = yield take(actions.CHALLENGE_CREATED_EVENT);
    const expiryTime = action.expirationTime * 1000;
    const waitDuration = expiryTime - Date.now();
    yield delay(waitDuration);
    yield put(actions.challengedTimedOut());
  }
}