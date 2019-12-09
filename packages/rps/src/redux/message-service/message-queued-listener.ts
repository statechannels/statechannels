import {take, fork} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';
import {reduxSagaFirebase} from '../../gateways/firebase';
import {RPSChannelClient} from '../../utils/rps-channel-client';

export function* messageQueuedListener(client: RPSChannelClient) {
  const subscribe = emit => client.onMessageQueued(emit);
  const channel = eventChannel(subscribe, buffers.fixed(20));

  while (true) {
    const notification = yield take(channel);
    const to = notification.params.recipient;
    yield fork(
      reduxSagaFirebase.database.create,
      `/messages/${to.toLowerCase()}`,
      sanitizeMessageForFirebase(notification.params)
    );
  }
}

function sanitizeMessageForFirebase(message) {
  return JSON.parse(JSON.stringify(message));
}
