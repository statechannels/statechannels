import {updateChannel} from '../updateChannel';
import {updateChannelFixture, channelStateFixture} from '../fixtures/updateChannel';

test('validUpdate', () => {
  updateChannel(updateChannelFixture(), channelStateFixture());
});
