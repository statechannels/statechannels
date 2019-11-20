import {take, put} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';
import {JsonRPCNotification, Message, NotificationName} from '../../utils/channel-client';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {updateChannelState} from '../game/actions';

// TODO this is copied from message-queued-listener.ts so can be factored into a helper
function createSubscribeFunction(
  rpsChannelClient: RPSChannelClient,
  notificationName: NotificationName
) {
  const subscribe = emit => {
    rpsChannelClient.onMessageReceived(notificationName, event => {
      emit(event);
    });

    return () => {
      rpsChannelClient.unSubscribe(notificationName); // TODO
    };
  };
  return subscribe;
}

export function* channelUpdatedListener() {
  const rpsChannelClient = new RPSChannelClient();
  const subscribe = createSubscribeFunction(rpsChannelClient, 'ChannelUpdated');
  const channel = eventChannel(subscribe, buffers.fixed(10));

  while (true) {
    const message: JsonRPCNotification<Message> = yield take(channel);
    yield put(updateChannelState(message.params.data));
  }
}
