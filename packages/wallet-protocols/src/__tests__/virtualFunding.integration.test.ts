import { ethers } from 'ethers';
import waitForExpect from 'wait-for-expect';
import { interpret } from 'xstate';
import { Channel } from '@statechannels/nitro-protocol';

import { Store, Participant, EphemeralStore } from '../store';
import { messageService } from '../messaging';
import { AddressableMessage } from '../wire-protocol';
import { Chain } from '../chain';
import { VirtualLeaf, VirtualHub } from '../protocols';
import { MachineFactory } from '../machine-utils';
import { Balance } from '../types';
import { CHAIN_ID } from '../constants';
import { log } from '../utils';
import { IChannelStoreEntry } from '../ChannelStoreEntry';

import { wallet1, wallet2, wallet3, threeParticipants as participants } from './data';
import { invokedState } from './utils';

jest.setTimeout(10000);

const chain = new Chain();

const stores: Record<string, Store> = {};

function connect<T>(
  wallet: ethers.Wallet,
  context: T,
  machineConstructor: MachineFactory<T, any>,
  { participantId }: Participant
) {
  const store = new EphemeralStore({ chain, privateKeys: { [wallet.address]: wallet.privateKey } });

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

test('virtually funding a channel', async () => {
  const balances: Balance[] = [
    { address: wallet1.address, wei: '0x35' },
    { address: wallet2.address, wei: '0x11' },
  ];
  const targetChannelId = '0xabc';
  const targetParticipants = participants.map(p => p.signingAddress);
  const hubAddress = wallet3.address;
  const guarantorChannels: [Channel, Channel] = [
    {
      chainId: CHAIN_ID,
      participants: [targetParticipants[0], hubAddress],
      channelNonce: '0x01',
    },
    {
      chainId: CHAIN_ID,
      participants: [targetParticipants[1], hubAddress],
      channelNonce: '0x02',
    },
  ];

  const jointChannel: Channel = {
    chainId: CHAIN_ID,
    participants: [targetParticipants[0], hubAddress, targetParticipants[1]],
    channelNonce: '0xaa',
  };

  const entry: (store: Store, channel: Channel) => IChannelStoreEntry = (store, channel) => ({
    channel,
    participants: participants.filter(p =>
      channel.participants.find(addr => addr === p.signingAddress)
    ),
    privateKey: store.getPrivateKey(channel.participants),
  });

  const leafContext = (index: VirtualLeaf.Indices): VirtualLeaf.Init => ({
    balances,
    hubAddress,
    index,
    targetChannelId,
    guarantorChannel: guarantorChannels[index],
    jointChannel,
  });

  const hubContext: VirtualHub.Init = {
    balances,
    hubAddress,
    targetChannelId,
    guarantorChannels,
    jointChannel,
  };

  const left = connect(wallet1, leafContext(0), VirtualLeaf.machine, participants[0]);
  const right = connect(wallet2, leafContext(1), VirtualLeaf.machine, participants[1]);
  const hub = connect(wallet3, hubContext, VirtualHub.machine, participants[2]);

  {
    const store = stores.first;
    store.initializeChannel(entry(store, jointChannel));
    store.initializeChannel(entry(store, guarantorChannels[0]));
  }
  {
    const store = stores.second;
    store.initializeChannel(entry(store, jointChannel));
    store.initializeChannel(entry(store, guarantorChannels[1]));
  }
  {
    const store = stores.third;
    store.initializeChannel(entry(store, jointChannel));
    store.initializeChannel(entry(store, guarantorChannels[0]));
    store.initializeChannel(entry(store, guarantorChannels[1]));
  }

  [left, right, hub].map(service => service.start());

  await waitForExpect(() => {
    stores;
    debugger;

    expect(left.state.value).toEqual('success');
    expect(hub.state.value).toEqual('success');
    expect(right.state.value).toEqual('success');
  }, 500);
});
