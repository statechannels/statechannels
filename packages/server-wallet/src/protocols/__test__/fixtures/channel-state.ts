import { ChannelStateFunding, ChannelStateWithSupported } from '../../state';
import { stateWithHashSignedBy } from '../../../wallet/__test__/fixtures/states';
import { fixture } from '../../../wallet/__test__/fixtures/utils';
import { alice, bob } from '../../../wallet/__test__/fixtures/participants';

const defaultChannelState: ChannelStateWithSupported = {
  channelId: '0x1234',
  myIndex: 0,
  participants: [alice(), bob()],
  supported: stateWithHashSignedBy()({ turnNum: 3 }),
  latest: stateWithHashSignedBy()({ turnNum: 3 }),
  latestSignedByMe: stateWithHashSignedBy()({ turnNum: 3 }),
  funding: (): ChannelStateFunding => ({ amount: '0x00', transferredOut: [] }),
  chainServiceRequests: [],
  fundingStrategy: 'Direct',
};

export const channelStateFixture = fixture(defaultChannelState);
