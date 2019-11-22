import { take, call } from 'redux-saga/effects';
import { buffers } from 'redux-saga';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { RPSChannelClient } from '../../utils/rps-channel-client';

export function* firebaseInboxListener() {
  const rpsChannelClient = new RPSChannelClient();
  const address = yield rpsChannelClient.getAddress();
  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address.toLowerCase()}`,
    'child_added',
    buffers.fixed(10)
  );
  while (true) {
    const message = yield take(channel);
    const key = message.snapshot.key;
    yield call(rpsChannelClient.pushMessage, message);
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}
