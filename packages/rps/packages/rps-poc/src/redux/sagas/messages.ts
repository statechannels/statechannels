import { fork, take, cancel } from 'redux-saga/effects';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { MessageTypes, syncMessages } from '../actions/messages';

function * syncMessagesSaga () {
  // todo: sync messages for the current channel
  yield fork(
    reduxSagaFirebase.database.sync,
    'messages',
    {
      successActionCreator: syncMessages,
    }
  );
}

export default function * messageSaga () {
  while( yield take(MessageTypes.SUBSCRIBE_MESSAGES) ) {
    const messageSync = yield fork(syncMessagesSaga);
    yield take(MessageTypes.UNSUBSCRIBE_MESSAGES);
    yield cancel(messageSync);
  }
}
