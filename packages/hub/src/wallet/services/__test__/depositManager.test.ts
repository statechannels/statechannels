import {bigNumberify} from 'ethers/utils';
import {Uint256} from '../../../types';
import {DUMMY_ASSET_HOLDER_ADDRESS} from '../../../test/test-constants';
import {FUNDED_CHANNEL_ID, UNFUNDED_CHANNEL_ID} from '../../../test/test-data';
import Channel from '../../models/channel';
import {
  AssetHolderWatcherEvent,
  AssetHolderWatcherEventType
} from '../../services/asset-holder-watcher';
import {Blockchain} from '../../services/blockchain';
import {onDepositEvent} from '../../services/depositManager';

async function getHoldings(channelId) {
  const channel = await Channel.query()
    .findOne('channel_id', channelId)
    .eager('[holdings]');
  return channel.holdings;
}

// Mock out Blockchain funding
async function fundFunction(): Promise<Uint256> {
  return new Promise<string>(resolve => resolve('a'));
}
const mockBlockchainFund = jest.fn().mockImplementation(fundFunction);
Blockchain.fund = mockBlockchainFund;
const amountDeposited = bigNumberify(5).toHexString();

beforeEach(() => {
  mockBlockchainFund.mockClear();
});

describe('deposit manager', () => {
  describe('no existing holdings for channel', () => {
    it('should deposit, asset holder not fully funded', async () => {
      const destinationHoldings = bigNumberify(5).toHexString();
      const assetHolderEvent: AssetHolderWatcherEvent = {
        eventType: AssetHolderWatcherEventType.Deposited,
        assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
        channelId: UNFUNDED_CHANNEL_ID,
        amountDeposited,
        destinationHoldings
      };
      await onDepositEvent(assetHolderEvent);

      const postEventHoldings = await getHoldings(UNFUNDED_CHANNEL_ID);
      expect(postEventHoldings).toHaveLength(1);
      expect(postEventHoldings[0]).toEqual(
        expect.objectContaining({
          assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
          amount: destinationHoldings
        })
      );
      expect(mockBlockchainFund).toHaveBeenCalledWith(UNFUNDED_CHANNEL_ID, '0x05', '0x05');
    });
  });

  describe('existing holdings for channel', () => {
    it('should not deposit, asset holder fully funded', async () => {
      const destinationHoldings = bigNumberify(10).toHexString();
      const assetHolderEvent: AssetHolderWatcherEvent = {
        eventType: AssetHolderWatcherEventType.Deposited,
        assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
        channelId: FUNDED_CHANNEL_ID,
        amountDeposited,
        destinationHoldings
      };
      await onDepositEvent(assetHolderEvent);

      const postEventHoldings = await getHoldings(FUNDED_CHANNEL_ID);
      expect(postEventHoldings).toHaveLength(1);
      expect(postEventHoldings[0]).toEqual(
        expect.objectContaining({
          assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
          amount: destinationHoldings
        })
      );
      expect(mockBlockchainFund).toHaveBeenCalledTimes(0);
    });

    it('should deposit, asset holder not fully funded', async () => {
      const destinationHoldings = bigNumberify(5).toHexString();
      const assetHolderEvent: AssetHolderWatcherEvent = {
        eventType: AssetHolderWatcherEventType.Deposited,
        assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
        channelId: FUNDED_CHANNEL_ID,
        amountDeposited,
        destinationHoldings
      };
      await onDepositEvent(assetHolderEvent);

      const postEventHoldings = await getHoldings(FUNDED_CHANNEL_ID);
      expect(postEventHoldings).toHaveLength(1);
      expect(postEventHoldings[0]).toEqual(
        expect.objectContaining({
          assetHolderAddress: DUMMY_ASSET_HOLDER_ADDRESS,
          amount: destinationHoldings
        })
      );
      expect(mockBlockchainFund).toHaveBeenCalledWith(FUNDED_CHANNEL_ID, '0x05', '0x05');
    });
  });
});
