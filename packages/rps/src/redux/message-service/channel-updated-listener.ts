import {take, put} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {updateChannelState} from '../game-v2/actions';
import {ChannelState} from '../../core';

export function* channelUpdatedListener() {
  const rpsChannelClient = new RPSChannelClient();

  const subscribe = emit => {
    rpsChannelClient.onChannelUpdated(channelState => {
      emit(channelState);
    });

    return () => {
      rpsChannelClient.unSubscribe('ChannelUpdated');
    };
  };

  const channel = eventChannel(subscribe, buffers.fixed(10));

  while (true) {
    const channelState: ChannelState = yield take(channel);
    yield put(updateChannelState(channelState));
  }
}
