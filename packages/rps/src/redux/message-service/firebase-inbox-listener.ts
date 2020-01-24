import {take, call, apply} from 'redux-saga/effects';

import {default as firebase, reduxSagaFirebase} from '../../gateways/firebase';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {Message} from '@statechannels/channel-client';
import {buffers} from 'redux-saga';
import {FIREBASE_PREFIX} from '../../constants';

export function* firebaseInboxListener(client: RPSChannelClient) {
  const address: string = (yield call([client, 'getAddress'])).toLowerCase();
  // ^ ensure this matches the to in message-queued-listener.ts
  const channel = yield call(
    reduxSagaFirebase.database.channel as any,
    `${FIREBASE_PREFIX}/messages/${address.toLowerCase()}`,
    'child_added',
    buffers.fixed(100)
  );
  const disconnect = firebase
    .database()
    .ref(`/${FIREBASE_PREFIX}/messages/${address}`)
    .onDisconnect();

  // if we disconnect, delete all messages that we might otherwise have received:
  yield apply(disconnect, disconnect.remove, []);

  while (true) {
    const firebaseResponse = yield take(channel);
    const key = firebaseResponse.snapshot.key;
    const message: Message = firebaseResponse.value;
    yield call(reduxSagaFirebase.database.delete, `/${FIREBASE_PREFIX}/messages/${address}/${key}`);
    yield call([client, 'pushMessage'], message);
  }
}
