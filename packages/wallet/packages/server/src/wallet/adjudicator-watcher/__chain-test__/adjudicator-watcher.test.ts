import { fork } from 'child_process';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core';
import { funded_channel } from '../../../test/test_data';
import AllocatorChannel from '../../models/allocatorChannel';
import { Blockchain } from '../../services/blockchain';

jest.setTimeout(60000);
const channelId = channelID(funded_channel);
let killSubprocess = null;

async function getHoldings() {
  return (await AllocatorChannel.query()
    .where('channel_id', channelId)
    .first()
    .select('holdings')).holdings;
}

describe('adjudicator listener', () => {
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

    await Blockchain.fund(channelId, '0x0', bigNumberify(5).toHexString());
  });
});

afterEach(() => {
  killSubprocess();
});
