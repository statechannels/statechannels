import {ChannelStateWithSupported} from '../../state';
import {stateWithHashSignedBy} from '../../../wallet/__test__/fixtures/states';
import {Uint256} from '../../../type-aliases';
import {fixture} from '../../../wallet/__test__/fixtures/utils';
import {alice, bob} from '../../../wallet/__test__/fixtures/participants';

const defaultChannelState: ChannelStateWithSupported = {
  channelId: '0x1234',
  myIndex: 0,
  participants: [alice(), bob()],
  supported: stateWithHashSignedBy()({turnNum: 3}),
  latest: stateWithHashSignedBy()({turnNum: 3}),
  latestSignedByMe: stateWithHashSignedBy()({turnNum: 3}),
  funding: (): Uint256 => '0x00',
};

export const channelStateFixture = fixture(defaultChannelState);
