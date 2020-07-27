import {updateChannel} from '../update-channel';
import {updateChannelFixture} from '../fixtures/update-channel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';

test('validUpdate', () => {
  updateChannel(updateChannelFixture(), channelStateFixture());
});
