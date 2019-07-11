import { bigNumberify } from 'ethers/utils';
import { Address, Uint256 } from 'fmg-core';
import { DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID } from '../../test-constants';
import AllocatorChannel from '../models/allocatorChannel';
import { Blockchain } from '../services/blockchain';
import { onDepositEvent } from '../services/depositManager';

const channelId = DUMMY_RULES_BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID;

async function getHoldings() {
  return (await AllocatorChannel.query()
    .where('channel_id', channelId)
    .first()
    .select('holdings')).holdings;
}

// Mock out Blockchain funding
async function fundFunction(
  channelID: Address,
  expectedHeld: Uint256,
  value: Uint256,
): Promise<Uint256> {
  return new Promise<string>((resolve, reject) => resolve('a'));
}
const mockBlockchainFund = jest.fn().mockImplementation(fundFunction);
Blockchain.fund = mockBlockchainFund;
const amountDeposited = bigNumberify(5).toHexString();

beforeEach(() => {
  mockBlockchainFund.mockClear();
});

describe('deposit manager', () => {
  it('should not deposit, adjudicator fully funded', async () => {
    const destinationHoldings = bigNumberify(10).toHexString();
    await onDepositEvent(channelId, amountDeposited, destinationHoldings);

    const postEventHoldings = await getHoldings();
    expect(postEventHoldings).toMatch(destinationHoldings);
    expect(mockBlockchainFund).toBeCalledTimes(0);
  });

  it('should deposit, adjudicator not fully funded', async () => {
    const destinationHoldings = bigNumberify(5).toHexString();
    await onDepositEvent(channelId, amountDeposited, destinationHoldings);

    const postEventHoldings = await getHoldings();
    expect(postEventHoldings).toMatch(destinationHoldings);
    expect(mockBlockchainFund).toBeCalledWith(channelId, '0x05', '0x05');
  });
});
