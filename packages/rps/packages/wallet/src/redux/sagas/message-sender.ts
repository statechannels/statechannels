import { put } from 'redux-saga/effects';
import { messageSent } from '../actions';

export function* messageSender(message) {
  window.parent.postMessage(message, '*');

  yield put(message);
  yield put(messageSent());
}
