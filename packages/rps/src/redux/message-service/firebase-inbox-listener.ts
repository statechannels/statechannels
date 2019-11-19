import { take, call } from 'redux-saga/effects';
import { buffers } from 'redux-saga';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { ChannelClient } from '../../utils/channelClient';

export function* firebaseInboxListener() {
  const channelClient = new ChannelClient();
  const address = yield channelClient.getAddress();
  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address.toLowerCase()}`,
    'child_added',
    buffers.fixed(10)
  );
  while (true) {
    const message = yield take(channel);
    const key = message.snapshot.key;
    yield call(channelClient.pushMessage, message);
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}
