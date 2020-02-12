import {
  Channel,
  getChannelId,
  AllocationAssetOutcome,
  convertAddressToBytes32,
} from '@statechannels/nitro-protocol';
import { interpret } from 'xstate';
import { Wallet } from 'ethers';
import waitForExpect from 'wait-for-expect';

import { AddressZero, HashZero } from 'ethers/constants';

import { AddressableMessage } from '../wire-protocol';
import { Chain } from '../chain';
import { CHAIN_ID } from '../constants';
import { CreateAndDirectFund } from '../protocols';
import { IChannelStoreEntry } from '../ChannelStoreEntry';
import { log } from '../utils';
import { MachineFactory } from '../machine-utils';
import { messageService } from '../messaging';
import { ObsoleteStore, Participant } from '../store';

import { wallet1, wallet2, participants, storeWithKey } from './data';
import { invokedState } from './utils';

jest.setTimeout(10000);

const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;

const chain = new Chain();

const stores: Record<string, ObsoleteStore> = {};

function connect<T>(
  wallet: Wallet,
  context: T,
  machineConstructor: MachineFactory<T, any>,
  { participantId }: Participant
) {
  const store = storeWithKey(chain, wallet.privateKey);

  stores[participantId] = store;
  const service = interpret<any, any, any>(machineConstructor(store, context));

  stores[participantId] = store;
  messageService.on('message', ({ to, ...event }: AddressableMessage) => {
    if (to === participantId && event.type === 'SendStates') {
      store.receiveStates(event.signedStates);
    }
  });

  service.onTransition(state => log(`${participantId} -- ${invokedState({ state } as any)}`));

  return service;
}

test('directly funding a channel', async () => {
  const allocations: AllocationAssetOutcome[] = [
    {
      assetHolderAddress: AddressZero,
      allocationItems: [
        { destination: convertAddressToBytes32(wallet1.address), amount: '0x01' },
        { destination: convertAddressToBytes32(wallet2.address), amount: '0x01' },
      ],
    },
  ];

  const entry: (store: ObsoleteStore, channel: Channel) => IChannelStoreEntry = (
    store,
    channel
  ) => ({
    channel,
    participants: participants.filter(p =>
      channel.participants.find(addr => addr === p.signingAddress)
    ),
    privateKey: store.getPrivateKey(channel.participants),
    states: [],
  });

  const initializedChannel: Channel = {
    chainId: CHAIN_ID,
    participants: participants.map(p => p.signingAddress),
    channelNonce: '0xaa',
  };

  const context = (index: CreateAndDirectFund.Indices): CreateAndDirectFund.Init => ({
    channelId: getChannelId(initializedChannel),
    participants,
    allocations,
    challengeDuration: 100,
    appDefinition: AddressZero,
    appData: HashZero,
    index,
  });

  const left = connect(wallet1, context(0), CreateAndDirectFund.machine, participants[0]);
  const right = connect(wallet2, context(1), CreateAndDirectFund.machine, participants[1]);

  {
    const store = stores.first;
    store.initializeChannel(entry(store, initializedChannel));
  }

  {
    const store = stores.second;
    store.initializeChannel(entry(store, initializedChannel));
  }

  [left, right].map(service => service.start());

  await waitForExpect(() => {
    expect(left.state.value).toEqual('success');
    expect(right.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);
});
