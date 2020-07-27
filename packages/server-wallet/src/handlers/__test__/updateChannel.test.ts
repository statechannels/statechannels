import {updateChannel} from '../updateChannel';
import {updateChannelFixture} from '../fixtures/updateChannel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';

test('validUpdate', () => {
  updateChannel(updateChannelFixture(), channelStateFixture());
});
