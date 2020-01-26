import { interpret } from 'xstate';
import { ethers } from 'ethers';
import waitForExpect from 'wait-for-expect';

import { Chain } from '../../chain';
import { Store } from '../..';
import { log } from '../../utils';

import { machine, Init } from './protocol';

jest.setTimeout(50000);

it('handles the basic case going first', async () => {
  const chain = new Chain();
  const store = new Store({ chain });
  const channelId = ethers.utils.id('channel');
  const context: Init = {
    channelId: ethers.utils.id('channel'),
    totalAfterDeposit: '0x05',
    depositAt: '0x00',
    fundedAt: '0x07',
  };
  const service = interpret<any, any, any>(machine(store, context));
  service.onTransition(state => log(state.value));

  service.start();

  await waitForExpect(async () => {
    expect(service.state.value).toMatchObject({ depositor: 'done', watcher: 'watching' });
    expect(await chain.getHoldings(channelId)).toEqual(context.totalAfterDeposit);
  }, 2000);

  await chain.deposit(channelId, '0x00', '2');

  await waitForExpect(async () => {
    expect(service.state.value).toMatchObject({ depositor: 'done', watcher: 'done' });
    expect(await chain.getHoldings(channelId)).toEqual(context.fundedAt);
  }, 200);
});

it('handles the basic case', async () => {
  const chain = new Chain();
  const store = new Store({ chain });
  const channelId = ethers.utils.id('channel');
  const context: Init = {
    channelId: ethers.utils.id('channel'),
    totalAfterDeposit: '0x05',
    depositAt: '0x01',
    fundedAt: '0x07',
  };
  const service = interpret<any, any, any>(machine(store, context));
  service.onTransition(state => {
    log(state.value);
  });

  service.start();
  await waitForExpect(() => {
    expect(service.state.value).toEqual({ depositor: 'idle', watcher: 'watching' });
  }, 2000);

  await chain.deposit(channelId, '0x00', '1');

  await waitForExpect(async () => {
    expect(service.state.value).toMatchObject({ depositor: 'done', watcher: 'watching' });
    expect(await chain.getHoldings(channelId)).toEqual(context.totalAfterDeposit);
  }, 200);

  // TODO: Find a good way of capturing transaction submission

  await chain.deposit(channelId, '0x05', '0x02');

  await waitForExpect(async () => {
    expect(service.state.done).toBe(true);
    expect(await chain.getHoldings(channelId)).toEqual(context.fundedAt);
  }, 200);
});
