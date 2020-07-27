import {updateChannel} from '../update-channel';
import {updateChannelFixture, channelStateFixture} from '../fixtures/update-channel';

test('validUpdate', () => {
  const result = updateChannel(updateChannelFixture(), channelStateFixture());
  expect(result).toEqualRight();
});
