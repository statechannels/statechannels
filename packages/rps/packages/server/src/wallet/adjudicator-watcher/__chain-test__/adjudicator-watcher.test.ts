import { fork } from 'child_process';
import { ethers } from 'ethers';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core/lib/channel';
import AllocatorChannel from '../../models/allocatorChannel';
import { channel, depositIntoContract } from './utils';

jest.setTimeout(60000);
const channelId = channelID(channel);
let killSubprocess = null;

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

    // We have to reference the compiled JS file instead of the TS source file
    // https://github.com/facebook/jest/issues/5274
    // https://github.com/facebook/jest/issues/8236
    const adjudicatorWatcher = fork('lib/wallet/adjudicator-watcher');

    killSubprocess = () => {
      adjudicatorWatcher.kill();
    };

    adjudicatorWatcher.on('message', async message => {
      console.log(`Parent received message: ${message}`);
      const postEventHoldings = await getHoldings();
      const depositedAmount = bigNumberify(postEventHoldings).sub(bigNumberify(preEventHoldings));
      expect(depositedAmount.toNumber()).toBeGreaterThanOrEqual(5);
      done();
    });

    await depositIntoContract(provider, channelId);
  });
});

afterEach(() => {
  killSubprocess();
});
