import { bigNumberify } from 'ethers/utils';
import { DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID } from '../../constants';
import AllocatorChannel from '../models/allocatorChannel';
import { onDepositEvent } from '../services/depositManager';

const channelId = DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID;

async function getHoldings() {
  return (await AllocatorChannel.query()
    .where('channel_id', channelId)
    .first()
    .select('holdings')).holdings;
}

// todo: it would be nice to figure out how to spy on the blockchain static fund method
jest.mock('../services/blockchain');

describe('deposit manager', () => {
  it('should deposit, adjudicator not fully funded', async () => {
    const amountDeposited = bigNumberify(5);
    const destinationHoldings = bigNumberify(5);

    await onDepositEvent(channelId, amountDeposited, destinationHoldings);

    const postEventHoldings = await getHoldings();
    expect(postEventHoldings).toMatch(destinationHoldings.toHexString());
  });

  it('should not deposit, adjudicator fully funded', async () => {
    const amountDeposited = bigNumberify(5);
    const destinationHoldings = bigNumberify(10);

    await onDepositEvent(channelId, amountDeposited, destinationHoldings);

    const postEventHoldings = await getHoldings();
    expect(postEventHoldings).toMatch(destinationHoldings.toHexString());
  });
});
