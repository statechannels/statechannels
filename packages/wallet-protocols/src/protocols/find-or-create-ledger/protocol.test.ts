import { interpret } from 'xstate';
import waitForExpect from 'wait-for-expect';
import { getChannelId } from '@statechannels/nitro-protocol';

import { Chain } from '../../chain';
import { EphemeralStore } from '../..';
import { log } from '../../utils';
import { participants, wallet1, ledgerState } from '../../__tests__/data';
import { IChannelStoreEntry } from '../../ChannelStoreEntry';

import { machine, Init } from './protocol';

jest.setTimeout(50000);

it('Creates a new ledger when one does not exist', async () => {
  const chain = new Chain();
  const privateKeys = {
    [wallet1.address]: wallet1.privateKey,
  };
  const store = new EphemeralStore({ chain, privateKeys });
  const context: Init = { participants };
  const service = interpret<any, any, any>(machine(store, context));
  service.onTransition(state => log(state.value));

  service.start();

  await waitForExpect(async () => {
    expect(service.state.value).toMatchObject({ createNewLedger: 'createNullChannel' });
  }, 2000);
});

it('Does not find an indirectly funded ledger channel when it exists', async () => {
  const chain = new Chain();
  const privateKeys = {
    [wallet1.address]: wallet1.privateKey,
  };
  const entry: IChannelStoreEntry = {
    channel: ledgerState.channel,
    states: [{ state: ledgerState, signatures: ['mock' as any, 'signature' as any] }],
    privateKey: wallet1.privateKey,
    participants,
    funding: { type: 'Indirect', ledgerId: 'fake' },
  };
  const store = new EphemeralStore({
    chain,
    privateKeys,
    store: {
      [getChannelId(ledgerState.channel)]: entry,
    },
  });

  const context: Init = { participants };
  const service = interpret<any, any, any>(machine(store, context));
  service.onTransition(state => log(state.value));

  service.start();

  await waitForExpect(async () => {
    expect(service.state.value).toMatchObject({ createNewLedger: 'createNullChannel' });
  }, 2000);
});

it('Finds a directly funded ledger channel when it exists', async () => {
  const chain = new Chain();
  const privateKeys = {
    [wallet1.address]: wallet1.privateKey,
  };
  const entry: IChannelStoreEntry = {
    channel: ledgerState.channel,
    states: [{ state: ledgerState, signatures: ['mock' as any, 'signature' as any] }],
    privateKey: wallet1.privateKey,
    participants,
    funding: { type: 'Direct' },
  };
  const store = new EphemeralStore({
    chain,
    privateKeys,
    store: {
      [getChannelId(ledgerState.channel)]: entry,
    },
  });

  debugger;
  const context: Init = { participants };
  const service = interpret<any, any, any>(machine(store, context));
  service.onTransition(state => log(state.value));

  service.start();

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('success');
    expect(service.state.context).toMatchObject({
      ledgerChannelId: getChannelId(ledgerState.channel),
    });
  }, 2000);
});
