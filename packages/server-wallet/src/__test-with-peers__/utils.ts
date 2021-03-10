import {ChannelResult} from '@statechannels/client-api-schema';

import {Wallet} from '..';

// TODO: Is there a cleaner way of writing this?
export async function expectLatestStateToMatch(
  channelId: string,
  wallet: Wallet,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await wallet.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
}
