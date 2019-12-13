import {take, call} from 'redux-saga/effects';

import {reduxSagaFirebase} from '../../gateways/firebase';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {Message} from '@statechannels/channel-client';
import {buffers} from 'redux-saga';

export function* firebaseInboxListener(client: RPSChannelClient) {
  const address: string = yield call([client, 'getAddress']);
  // TODO: Redux saga firebase accepts a buffer but the type definition hasn't been updated in the latest version (0.15.0)
  // so we just cast as any for now
  const channel = yield call(
    reduxSagaFirebase.database.channel as any,
    `/messages/${address.toLowerCase()}`,
    'child_added',
    buffers.fixed(100)
  );
  while (true) {
    const firebaseResponse = yield take(channel);
    const key = firebaseResponse.snapshot.key;
    const message: Message = firebaseResponse.value;
    yield call([client, 'pushMessage'], message);
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}
