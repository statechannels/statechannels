import {bigNumberify} from 'ethers/utils';
import {AssetHolderEventHandler, assetHolderListen, AssetHolderWatcherEvent} from '..';
import {FUNDED_NONCE_CHANNEL_ID} from '../../../test/test_data';
import {Blockchain} from '../../services/blockchain';

jest.setTimeout(20000);
const five = bigNumberify(5).toHexString();

describe('adjudicator listener', () => {
  it('should handle a funds received event when channel is in the database', async done => {
    let removeListeners = null;
    const eventHandler: AssetHolderEventHandler = (message: AssetHolderWatcherEvent) => {
      removeListeners();
      expect(message.channelId).toEqual(FUNDED_NONCE_CHANNEL_ID);
      expect(message.amountDeposited).toEqual(five);
      expect(message.destinationHoldings).toEqual(five);
      done();
    };

    removeListeners = await assetHolderListen(eventHandler);
    await Blockchain.fund(FUNDED_NONCE_CHANNEL_ID, '0x0', five);
  });
});
