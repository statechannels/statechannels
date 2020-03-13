import {bigNumberify} from 'ethers/utils';
import {assetHolderObservable} from '../asset-holder-watcher';
import {Blockchain} from '../transaction';
import {first} from 'rxjs/operators';

jest.setTimeout(20000);
const zero = bigNumberify(0);
const five = bigNumberify(5);

const channelId = '0x1823994d6d3b53b82f499c1aca2095b94108ba3ff59f55c6e765da1e24874ab2';

test('handles deposit event', async () => {
  const messagePromise = (await assetHolderObservable()).pipe(first()).toPromise();
  await Blockchain.fund(channelId, zero, five);
  const message = await messagePromise;
  expect(message.channelId).toEqual(channelId);
  expect(message.amountDeposited).toEqual(five);
  expect(message.destinationHoldings).toEqual(five);
});
