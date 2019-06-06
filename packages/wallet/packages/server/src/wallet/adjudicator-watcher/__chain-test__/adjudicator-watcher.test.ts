import { fork } from 'child_process';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core';
import { AdjudicatorWatcherEvent } from '..';
import { funded_channel } from '../../../test/test_data';
import { Blockchain } from '../../services/blockchain';

jest.setTimeout(20000);
const channelId = channelID(funded_channel);
let killSubprocess = null;
const five = bigNumberify(5).toHexString();

describe('adjudicator listener', () => {
  it('should handle a funds received event when channel is in the database', done => {
    // We have to reference the compiled JS file instead of the TS source file
    // https://github.com/facebook/jest/issues/5274
    // https://github.com/facebook/jest/issues/8236
    const adjudicatorWatcher = fork('lib/wallet/adjudicator-watcher', [], { execArgv: [] });

    killSubprocess = () => {
      adjudicatorWatcher.kill();
    };

    adjudicatorWatcher.on('message', async (message: AdjudicatorWatcherEvent) => {
      expect(message.channelId).toEqual(channelId);
      expect(message.amountDeposited).toEqual(five);
      expect(message.destinationHoldings).toEqual(five);
      done();
    });

    Blockchain.fund(channelId, '0x0', '0x5');
  });
});

afterEach(() => {
  killSubprocess();
});
