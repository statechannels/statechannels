import matchers from '@pacote/jest-either';
import {left} from 'fp-ts/lib/Either';

import {updateChannel, UpdateChannelError} from '../update-channel';
import {updateChannelFixture, signStateFixture} from '../fixtures/update-channel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';

expect.extend(matchers);

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight(signStateFixture());
});

const notMyTurn = new UpdateChannelError(UpdateChannelError.reasons.notMyTurn);

test.each`
  updateChannelArgs         | channelState                                      | result
  ${updateChannelFixture()} | ${channelStateFixture({supported: {turnNum: 4}})} | ${notMyTurn}
`('error cases', ({updateChannelArgs, channelState, result}) => {
  expect(updateChannel(updateChannelArgs, channelState)).toMatchObject(left(result));
});
