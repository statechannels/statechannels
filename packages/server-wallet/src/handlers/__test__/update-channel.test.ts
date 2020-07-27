import {updateChannel} from '../update-channel';
import {updateChannelFixture, channelStateFixture} from '../fixtures/update-channel';

test('validUpdate', () => {
  updateChannel(updateChannelFixture(), channelStateFixture());
});
