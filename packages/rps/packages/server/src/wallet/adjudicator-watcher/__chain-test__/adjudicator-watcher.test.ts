import { ethers } from 'ethers';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core/lib/channel';
import { listen } from '..';
import AllocatorChannel from '../../models/allocatorChannel';
import { channel, depositIntoContract } from './utils';

jest.setTimeout(60000);
const channelId = channelID(channel);
let removeListeners = null;

async function getHoldings() {
  return (await AllocatorChannel.query()
    .where('channel_id', channelId)
    .first()
    .select('holdings')).holdings;
}

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );

  it('should handle a funds received event when channel is in the database', async done => {
    const preEventHoldings = await getHoldings();

    const eventCallback = async eventType => {
      const postEventHoldings = await getHoldings();

      const depositedAmount = bigNumberify(postEventHoldings).sub(bigNumberify(preEventHoldings));
      expect(depositedAmount.toNumber()).toBeGreaterThanOrEqual(5);
      done();
    };

    removeListeners = await listen(eventCallback);
    await depositIntoContract(provider, channelId);
  });
});

afterEach(() => {
  removeListeners();
});
