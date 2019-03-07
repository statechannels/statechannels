import { put } from 'redux-saga/effects';
import { displayMessageSent } from '../actions';

export function* displaySender(displayMessage) {
  window.parent.postMessage(displayMessage, '*');
  yield put(displayMessageSent());
}
