import {DBOpenChannelObjective} from '../../../models/objective';
import {channel} from '../../../models/__test__/fixtures/channel';

import {alice, bob} from './participants';
import {fixture} from './utils';

const defaultObjective: DBOpenChannelObjective = {
  data: {targetChannelId: channel().channelId, role: 'app', fundingStrategy: 'Direct'},
  participants: [alice(), bob()],
  type: 'OpenChannel',
  objectiveId: ['OpenChannel', channel().channelId].join('-'),
  status: 'pending',
  waitingFor: null,
  createdAt: new Date(),
  progressLastMadeAt: new Date(),
};

export const openChannelObjective = fixture(defaultObjective);
