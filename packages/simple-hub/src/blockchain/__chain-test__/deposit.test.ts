import {bigNumberify} from 'ethers/utils';
import {assetHolderObservable} from '../asset-holder-watcher';
import {Blockchain} from '../transaction';
import {first, pairwise} from 'rxjs/operators';
import {attachToChainObservable} from '../../wallet/chain-event';

jest.setTimeout(20000);
const zero = bigNumberify(0);
const five = bigNumberify(5);
const ten = bigNumberify(10);

const channelId1 = '0x1823994d6d3b53b82f499c1aca2095b94108ba3ff59f55c6e765da1e24874ab2';
const channelId2 = '0x1823994d6d3b53b82f499c1aca2095b94108ba3ff59f55c6e765da1e24874ab3';

test('chain observable: detect deposit events', async () => {
  const messagePromise = (await assetHolderObservable()).pipe(first()).toPromise();
  await Blockchain.fund(channelId1, zero, five);
  const message = await messagePromise;
  expect(message.channelId).toEqual(channelId1);
  expect(message.amountDeposited).toEqual(five);
  expect(message.destinationHoldings).toEqual(five);
});

test('chain observable: matches deposit events', async () => {
  attachToChainObservable(await assetHolderObservable());
  const messagePromise = (await assetHolderObservable()).pipe(pairwise(), first()).toPromise();

  await Blockchain.fund(channelId2, zero, five);

  const message = (await messagePromise)[1];
  expect(message.channelId).toEqual(channelId2);
  expect(message.amountDeposited).toEqual(five);
  expect(message.destinationHoldings).toEqual(ten);
});
