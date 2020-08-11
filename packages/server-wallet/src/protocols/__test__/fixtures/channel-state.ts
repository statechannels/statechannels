import {ChannelStateWithSupported} from '../../state';
import {stateWithHashSignedBy} from '../../../wallet/__test__/fixtures/states';
import {Uint256} from '../../../type-aliases';
import {fixture} from '../../../wallet/__test__/fixtures/utils';

const defaultChannelState: ChannelStateWithSupported = {
  channelId: '0x1234',
  myIndex: 0,
  supported: stateWithHashSignedBy()({turnNum: 3}),
  latest: stateWithHashSignedBy()({turnNum: 3}),
  latestSignedByMe: stateWithHashSignedBy()({turnNum: 3}),
  funding: (): Uint256 => '0x0',
};

export const channelStateFixture = fixture(defaultChannelState);
