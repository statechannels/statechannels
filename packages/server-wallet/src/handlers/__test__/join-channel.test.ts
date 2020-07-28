import matchers from '@pacote/jest-either';

import {joinChannel} from '../join-channel';
import {joinChannelFixture} from '../fixtures/join-channel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';
expect.extend(matchers);

const args = joinChannelFixture();

test('validJoin', () => {
  expect(
    joinChannel(args, channelStateFixture({latest: {turnNum: 0, appData: 'foo'}}))
  ).toMatchRight({
    type: 'SignState',
    turnNum: 0,
    appData: 'foo',
  });
});

describe('invalid join', () => {
  test('when the latest state is not turn 0', () =>
    expect(joinChannel(args, channelStateFixture({latest: {turnNum: 3}}))).toMatchObject({
      left: new Error('latest state must be turn 0'),
    }));

  test('when I have signed a state', () =>
    expect(
      joinChannel(args, channelStateFixture({latest: {turnNum: 0}, latestSignedByMe: {turnNum: 0}}))
    ).toMatchObject({
      left: new Error('already signed prefund setup'),
    }));
});
