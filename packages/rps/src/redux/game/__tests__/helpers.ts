import * as match from 'redux-saga-test-plan/matchers';
import {ChannelState} from '../../../core';
import {RPSChannelClient} from '../../../utils/rps-channel-client';

export const rpsChannelClientMocks = (client: RPSChannelClient) => {
  // checks and mocks a createChannel call, in the format expected by expectSaga.provide
  const callCreateChannel = (state: ChannelState): [match.Matcher, any] => [
    match.call(
      [client, 'createChannel'],
      state.aAddress,
      state.bAddress,
      state.aBal,
      state.bBal,
      state.appData,
      state.aAddress,
      state.bAddress
    ),
    Promise.resolve(state),
  ];
  // checks and mocks a joinChannel call, in the format expected by expectSaga.provide
  const callJoinChannel = (state: ChannelState): [match.Matcher, any] => [
    match.call([client, 'joinChannel'], state.channelId),
    Promise.resolve(state),
  ];
  // checks and mocks an updateChannel call, in the format expected by expectSaga.provide
  const callUpdateChannel = (state: ChannelState): [match.Matcher, any] => [
    match.call(
      [client, 'updateChannel'],
      state.channelId,
      state.aAddress,
      state.bAddress,
      state.aBal,
      state.bBal,
      state.appData,
      state.aAddress,
      state.bAddress
    ),
    Promise.resolve(state),
  ];
  // checks and mocks a closeChannel call, in the format expected by expectSaga.provide
  const callCloseChannel = (state: ChannelState): [match.Matcher, any] => [
    match.call([client, 'closeChannel'], state.channelId),
    Promise.resolve(state),
  ];

  return {callCreateChannel, callJoinChannel, callUpdateChannel, callCloseChannel};
};
