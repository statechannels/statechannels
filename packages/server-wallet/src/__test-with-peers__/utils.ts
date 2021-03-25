import {ChannelResult} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Engine} from '..';

export async function expectLatestStateToMatch(
  channelId: string,
  engine: Engine,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await engine.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
}
