import matchers from '@pacote/jest-either';

import {updateChannel, UpdateChannelError, UpdateChannelErrors} from '../update-channel';
import {
  updateChannelFixture,
  channelStateFixture,
  signStateFixture,
} from '../fixtures/update-channel';

expect.extend(matchers);

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight(signStateFixture());
});

test('Not my turn', () => {
  const result = updateChannel(
    updateChannelFixture(),
    channelStateFixture({supported: {turnNum: 4}})
  );
  expect(result).toEqualLeft(new UpdateChannelError(UpdateChannelErrors.notMyTurn));
});
