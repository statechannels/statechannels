import matchers from '@pacote/jest-either';
import {left} from 'fp-ts/lib/Either';

import {updateChannel, UpdateChannelError} from '../update-channel';
import {updateChannelFixture, signStateFixture} from '../fixtures/update-channel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';
import {ChannelState} from '../../protocols/state';

expect.extend(matchers);

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight(signStateFixture());
});

const invalidLatest = new UpdateChannelError(UpdateChannelError.reasons.invalidLatestState);
const notMyTurn = new UpdateChannelError(UpdateChannelError.reasons.notMyTurn);

const noSupportedState: ChannelState = {...channelStateFixture(), supported: undefined};
test.each`
  updateChannelArgs         | channelState                                      | result
  ${updateChannelFixture()} | ${noSupportedState}                               | ${invalidLatest}
  ${updateChannelFixture()} | ${channelStateFixture({supported: {turnNum: 4}})} | ${notMyTurn}
`('error cases $result', ({updateChannelArgs, channelState, result}) => {
  expect(updateChannel(updateChannelArgs, channelState)).toMatchObject(left(result));
});
