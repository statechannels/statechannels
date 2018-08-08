import { fork, take, cancel } from 'redux-saga/effects';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { MessageActionType, MessageAction } from '../actions/messages';

function * syncMessagesSaga () {
  // todo: sync messages for the current channel
  yield fork(
    reduxSagaFirebase.database.sync,
    'messages',
    {
      successActionCreator: MessageAction.syncMessages,
    },
    'value'
  );
}

export default function * messageSaga () {
  while( yield take(MessageActionType.SUBSCRIBE_MESSAGES) ) {
    const messageSync = yield fork(syncMessagesSaga);
    yield take(MessageActionType.UNSUBSCRIBE_MESSAGES);
    yield cancel(messageSync);
  }
}
