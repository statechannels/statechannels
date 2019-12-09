import { take, call } from 'redux-saga/effects';

import { reduxSagaFirebase } from '../../gateways/firebase';
import { RPSChannelClient } from '../../utils/rps-channel-client';
import { Message } from '@statechannels/channel-client';

export function* firebaseInboxListener(client: RPSChannelClient) {
  const address: string = yield call([client, 'getAddress']);
  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address.toLowerCase()}`,
    'child_added'
  );
  while (true) {
    const firebaseResponse = yield take(channel);
    const key = firebaseResponse.snapshot.key;
    const message: Message = firebaseResponse.value;
    yield call([client, 'pushMessage'], message);
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}
