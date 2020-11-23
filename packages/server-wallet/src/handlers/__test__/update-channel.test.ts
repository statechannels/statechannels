import matchers from '@pacote/jest-either';

import { updateChannel, UpdateChannelError } from '../update-channel';
import { updateChannelFixture } from '../fixtures/update-channel';
import { signStateFixture } from '../../protocols/__test__/fixtures/actions';
import { channelStateFixture } from '../../protocols/__test__/fixtures/channel-state';
import { ChannelState } from '../../protocols/state';

expect.extend(matchers);

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight(signStateFixture());
});

const invalidLatest = new UpdateChannelError(UpdateChannelError.reasons.invalidLatestState);
const runningTurnNumber = new UpdateChannelError(UpdateChannelError.reasons.notInRunningStage);
const notMyTurn = new UpdateChannelError(UpdateChannelError.reasons.notMyTurn);

const noSupportedState: ChannelState = { ...channelStateFixture(), supported: undefined };
test.each`
  updateChannelArgs         | channelState                                          | result
  ${updateChannelFixture()} | ${noSupportedState}                                   | ${invalidLatest}
  ${updateChannelFixture()} | ${channelStateFixture({ supported: { turnNum: 1 } })} | ${runningTurnNumber}
  ${updateChannelFixture()} | ${channelStateFixture({ supported: { turnNum: 4 } })} | ${notMyTurn}
`('error cases $result', ({ updateChannelArgs, channelState, result }) => {
  expect(updateChannel(updateChannelArgs, channelState)).toEqualLeft(result);
});
