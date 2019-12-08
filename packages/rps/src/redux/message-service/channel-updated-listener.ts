import {take, put} from 'redux-saga/effects';
import {buffers, eventChannel} from 'redux-saga';
import {updateChannelState} from '../game/actions';
import {ChannelState} from '../../core';
import {RPSChannelClient} from '../../utils/rps-channel-client';

export function* channelUpdatedListener(client: RPSChannelClient) {
  const subscribe = emit => client.onChannelUpdated(emit);
  const channel = eventChannel(subscribe, buffers.fixed(20));

  while (true) {
    const channelState: ChannelState = yield take(channel);
    yield put(updateChannelState(channelState));
  }
}
