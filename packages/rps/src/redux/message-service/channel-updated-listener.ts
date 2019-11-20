import {take, put} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';
import {JsonRPCNotification, Message} from '../../utils/channel-client';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {updateChannelState} from '../game/actions';

export function* channelUpdatedListener() {
  const rpsChannelClient = new RPSChannelClient();

  const subscribe = emit => {
    rpsChannelClient.onChannelUpdated(event => {
      emit(event);
    });

    return () => {
      rpsChannelClient.unSubscribe('ChannelUpdated');
    };
  };

  const channel = eventChannel(subscribe, buffers.fixed(10));

  while (true) {
    const message: JsonRPCNotification<Message> = yield take(channel);
    yield put(updateChannelState(message.params.data));
  }
}
