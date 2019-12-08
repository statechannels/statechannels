import {bigNumberify} from 'ethers/utils';
import {FUNDED_CHANNEL_ID} from '../../../test/test-data';
import {
  AssetHolderEventHandler,
  assetHolderListen,
  AssetHolderWatcherEvent
} from '../asset-holder-watcher';
import {Blockchain} from '../blockchain';

jest.setTimeout(20000);
const five = bigNumberify(5).toHexString();

describe('asset holder listener', () => {
  // eslint-disable-next-line jest/no-test-callback
  it('should handle a funds received event when channel is in the database', async done => {
    let removeListeners = null;
    const eventHandler: AssetHolderEventHandler = (message: AssetHolderWatcherEvent) => {
      removeListeners();
      expect(message.channelId).toEqual(FUNDED_CHANNEL_ID);
      expect(message.amountDeposited).toEqual(five);
      expect(message.destinationHoldings).toEqual(five);
      done();
    };

    removeListeners = await assetHolderListen(eventHandler);
    await Blockchain.fund(FUNDED_CHANNEL_ID, '0x0', five);
  });
});
