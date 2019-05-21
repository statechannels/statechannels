import { fork } from 'child_process';
import { bigNumberify } from 'ethers/utils';
import { DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID } from '../../constants';
import { onDepositEvent } from '../services/depositManager';

jest.setTimeout(60000);
let killSubprocess = null;

describe('deposit manager', () => {
  it('should deposit, adjudicator not fully funded', async done => {
    const adjudicatorWatcher = fork('lib/wallet/adjudicator-watcher');
    killSubprocess = () => {
      adjudicatorWatcher.kill();
    };

    adjudicatorWatcher.on('message', async message => {
      console.log(`Parent received message: ${message}`);
      done();
    });

    const channelId = DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID;
    const amountDeposited = bigNumberify(5);
    const destinationHoldings = bigNumberify(5);
    await onDepositEvent(channelId, amountDeposited, destinationHoldings);
  });
});

afterEach(() => {
  killSubprocess();
});
