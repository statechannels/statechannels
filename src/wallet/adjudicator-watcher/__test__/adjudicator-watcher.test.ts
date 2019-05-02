import { ethers } from 'ethers';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core/lib/channel';
import AllocatorChannel from '../../models/allocatorChannel';
import { channel, depositContract } from './utils';
import { start } from '../../adjudicator-watcher';

jest.setTimeout(60000);

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );

  it('should handle a funds received event when channel is in the database', async done => {
    const channelId = channelID(channel);

    // todo: probably connected to a dev database
    const preEventRow = await AllocatorChannel.query()
      .where('channel_id', channelId)
      .first()
      .select('holdings', 'channel_id', 'nonce');

    const preEventHoldings = preEventRow.holdings;

    const eventCallback = jest.fn(async eventType => {
      const postEventHoldings = (await AllocatorChannel.query()
        .where({ channel_id: channelId })
        .first()
        .select('holdings')).holdings;

      // todo:
      // - wait for event monitor
      const eventDeposit = bigNumberify(postEventHoldings).sub(bigNumberify(preEventHoldings));
      expect(eventDeposit.toNumber()).toBeGreaterThan(5);
      done();
    });
    start(eventCallback);

    await depositContract(provider, channelId);
  });
});
