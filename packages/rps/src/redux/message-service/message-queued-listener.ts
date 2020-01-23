import {take, fork} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';
import {reduxSagaFirebase} from '../../gateways/firebase';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {RPS_ADDRESS} from '../../constants';

export function* messageQueuedListener(client: RPSChannelClient) {
  const subscribe = emit => client.onMessageQueued(emit);
  const channel = eventChannel(subscribe, buffers.fixed(20));

  while (true) {
    const notification = yield take(channel);
    const to = notification.params.recipient.toLowerCase();
    // ^ ensure this matches the address in firebase-inbox-listener.ts
    yield fork(
      reduxSagaFirebase.database.create,
      `/${RPS_ADDRESS}/messages/${to}`,
      sanitizeMessageForFirebase(notification.params)
    );
  }
}

function sanitizeMessageForFirebase(message) {
  return JSON.parse(JSON.stringify(message));
}
