import { take, put } from 'redux-saga/effects';
import { buffers, eventChannel } from 'redux-saga';
import {
  ChannelClient,
  JsonRPCNotification,
  Message,
  NotificationName,
} from '../../utils/channelClient';
import { updateChannelState } from '../game/actions';

// TODO this is copied from message-queued-listener.ts so can be factored into a helper
function createSubscribeFunction(channelClient: ChannelClient, notificationName: NotificationName) {
  const subscribe = emit => {
    channelClient.onMessageReceived(notificationName, event => {
      emit(event);
    });

    return () => {
      channelClient.unSubscribe(notificationName); // TODO
    };
  };
  return subscribe;
}

export function* channelUpdatedListener() {
  const channelClient = new ChannelClient();
  const subscribe = createSubscribeFunction(channelClient, 'ChannelUpdated');
  const channel = eventChannel(subscribe, buffers.fixed(10));

  while (true) {
    const message: JsonRPCNotification<Message> = yield take(channel);
    yield put(updateChannelState(message.params.data));
  }
}
