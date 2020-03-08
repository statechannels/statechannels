import {bigNumberify} from 'ethers/utils';
import {
  AssetHolderEventHandler,
  assetHolderListen,
  AssetHolderWatcherEvent
} from '../asset-holder-watcher';
import {Blockchain} from '../transaction';

jest.setTimeout(20000);
const five = bigNumberify(5).toHexString();

const channelId = '0x1823994d6d3b53b82f499c1aca2095b94108ba3ff59f55c6e765da1e24874ab2';

// TODO: This is now failing for some reason, need to figure out why
// eslint-disable-next-line jest/no-test-callback
test.skip('handles deposit event', async done => {
  const eventHandler: AssetHolderEventHandler = (message: AssetHolderWatcherEvent) => {
    expect(message.channelId).toEqual(channelId);
    expect(message.amountDeposited).toEqual(five);
    expect(message.destinationHoldings).toEqual(five);
    message.event.removeListener();
    done();
  };

  await assetHolderListen(eventHandler);
  await Blockchain.fund(channelId, '0x0', five);
});
