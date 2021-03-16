import {ChannelResult} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Wallet} from '..';

export async function expectLatestStateToMatch(
  channelId: string,
  wallet: Wallet,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await wallet.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
}
