import {ChannelResult, CreateChannelParams} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Engine} from '..';
import {participantA, participantB} from '../../jest/with-peers-setup-teardown';
import {createChannelArgs} from '../engine/__test__/fixtures/create-channel';

export async function expectLatestStateToMatch(
  channelId: string,
  engine: Engine,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await engine.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
}

export function getWithPeersCreateChannelsArgs(): CreateChannelParams {
  return createChannelArgs({
    participants: [participantA, participantB],
    fundingStrategy: 'Fake',
  });
}
