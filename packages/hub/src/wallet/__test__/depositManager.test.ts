import {bigNumberify} from 'ethers/utils';
import {Address, Uint256} from 'fmg-core';
import {DUMMY_ASSET_HOLDER_ADDRESS} from '../../test/test-constants';
import {BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID} from '../../test/test_data';
import Channel from '../models/channel';
import {
  AssetHolderWatcherEvent,
  AssetHolderWatcherEventType
} from '../services/asset-holder-watcher';
import {Blockchain} from '../services/blockchain';
import {onDepositEvent} from '../services/depositManager';

const channelId = BEGINNING_APP_CHANNEL_NONCE_CHANNEL_ID;

async function getHoldings() {
  const channel = await Channel.query()
    .findOne('channel_id', channelId)
    .eager('[holdings]');
  return channel.holdings;
}

// Mock out Blockchain funding
async function fundFunction(
  channelID: Address,
  expectedHeld: Uint256,
  value: Uint256
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
  it('should not deposit, asset holder fully funded', async () => {
    const destinationHoldings = bigNumberify(10).toHexString();
    const assetHolderEvent: AssetHolderWatcherEvent = {
      eventType: AssetHolderWatcherEventType.Deposited,
      assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
      channelId,
      amountDeposited,
      destinationHoldings
    };
    await onDepositEvent(assetHolderEvent);

    const postEventHoldings = await getHoldings();
    expect(postEventHoldings).toHaveLength(1);
    expect(postEventHoldings[0]).toEqual(
      expect.objectContaining({
        assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
        amount: destinationHoldings
      })
    );
    expect(mockBlockchainFund).toBeCalledTimes(0);
  });

  it('should deposit, asset holder not fully funded', async () => {
    const destinationHoldings = bigNumberify(5).toHexString();
    const assetHolderEvent: AssetHolderWatcherEvent = {
      eventType: AssetHolderWatcherEventType.Deposited,
      assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
      channelId,
      amountDeposited,
      destinationHoldings
    };
    await onDepositEvent(assetHolderEvent);

    const postEventHoldings = await getHoldings();
    expect(postEventHoldings).toHaveLength(1);
    expect(postEventHoldings[0]).toEqual(
      expect.objectContaining({
        assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
        amount: destinationHoldings
      })
    );
    expect(mockBlockchainFund).toBeCalledWith(channelId, '0x05', '0x05');
  });
});
