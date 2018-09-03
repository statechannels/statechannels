import { fork, take, takeEvery, cancel, call, put } from 'redux-saga/effects';
import { buffers } from 'redux-saga';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { MessageActionType, MessageAction, SendMessageAction, SubscribeMessagesAction } from '../actions/messages';

function * sendMessage(action: SendMessageAction) {
  const { to, data } = action;

  yield call(reduxSagaFirebase.database.create, `/messages/${to}`, data);

}

function * listenForMessagesSaga(address) {
  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address}`,
    'child_added',
    buffers.fixed(10),
  );

  while(true) {
    const message = yield take(channel);
    const key = message.snapshot.key;

    yield put(MessageAction.messageReceived(message.value));
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}

export default function * messageSaga () {
  yield takeEvery(MessageActionType.SEND_MESSAGE, sendMessage);

  while(true) {
    const action : SubscribeMessagesAction = yield take(MessageActionType.SUBSCRIBE_MESSAGES);
    const listener = yield fork(listenForMessagesSaga, action.address);
    yield take(MessageActionType.UNSUBSCRIBE_MESSAGES);
    yield cancel(listener);
  }
}
