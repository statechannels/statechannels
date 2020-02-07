import { ethers } from 'ethers';
import waitForExpect from 'wait-for-expect';
import { interpret } from 'xstate';
import { Channel, getChannelId, State, signState } from '@statechannels/nitro-protocol';

import { hexZeroPad } from 'ethers/utils';

import { Store, Participant } from '../../../store';
import { Chain } from '../../../chain';
import { CHAIN_ID } from '../../../constants';
import { IChannelStoreEntry } from '../../../ChannelStoreEntry';
import {
  wallet1,
  threeParticipants as participants,
  storeWithKey,
  ledgerState,
  appState,
  wallets,
} from '../../../__tests__/data';
import { invokedState } from '../../../__tests__/utils';
import { log } from '../../../utils';
import { Init, machine } from '../protocol';
import { MachineFactory } from '../../../machine-utils';
import { ethGuaranteeOutcome } from '../../../calculations';
import { messageService } from '../../../messaging';
import { SendStates } from '../../../wire-protocol';

jest.setTimeout(10000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;

const chain = new Chain();

function connect<T>(
  wallet: ethers.Wallet,
  context: T,
  machineConstructor: MachineFactory<T, any>,
  { participantId }: Participant
) {
  const store = storeWithKey(chain, wallet.privateKey);

  const m = machineConstructor(store, context);
  const service = interpret<any, any, any>(
    m.withConfig({ services: { advanceChannel: async () => {} } })
  );

  service.onTransition(state => log(`${participantId} -- ${invokedState({ state } as any)}`));

  return [service, store] as [typeof service, typeof store];
}

test('fundTarget', async () => {
  const guarantorChannels: [Channel, Channel] = [
    {
      chainId: CHAIN_ID,
      participants: [participants[0].signingAddress, participants[1].signingAddress],
      channelNonce: '0x01',
    },
    {
      chainId: CHAIN_ID,
      participants: [participants[2].signingAddress, participants[1].signingAddress],
      channelNonce: '0x02',
    },
  ];
  const targetChannelId = getChannelId(appState(0).channel);

  const jointChannel: Channel = {
    chainId: CHAIN_ID,
    participants: participants.map(p => p.signingAddress),
    channelNonce: '0xaa',
  };

  const context: Init = {
    jointChannelId: getChannelId(jointChannel),
    targetChannelId,
    guarantorChannelIds: [getChannelId(guarantorChannels[0])],
    targetAllocation: [
      {
        destination: participants[0].destination,
        amount: '0x35',
      },
    ],
  };

  const entry: (store: Store, channel: Channel) => IChannelStoreEntry = (store, channel) => ({
    channel,
    participants: participants.filter(p =>
      channel.participants.find(addr => addr === p.signingAddress)
    ),
    privateKey: store.getPrivateKey(channel.participants),
    states: [],
  });

  const [service, store] = connect(wallet1, context, machine, participants[0]);
  store.initializeChannel(entry(store, jointChannel));
  store.initializeChannel(entry(store, guarantorChannels[0]));

  messageService.on('message', ({ signedStates }: SendStates) => {
    store.receiveStates(
      signedStates.map(({ state }) => ({
        state,
        signatures: state.channel.participants.map(
          p => signState(state, wallets[p].privateKey).signature
        ),
      }))
    );
  });

  service.start();

  await waitForExpect(
    () => expect(service.state.value).toMatchObject({ fundTarget: 'waitForGuarantee' }),
    EXPECT_TIMEOUT
  );

  const state: State = {
    ...ledgerState,
    channel: guarantorChannels[0],
    outcome: ethGuaranteeOutcome(
      {
        destinations: [
          targetChannelId,
          participants[0].destination,
          participants[1].destination,
        ].map(makeDestination),
        targetChannelId: getChannelId(jointChannel),
      },
      store.ethAssetHolderAddress
    ),
  };
  await store.receiveStates([{ state, signatures: ['first' as any, 'second' as any] }]);

  await waitForExpect(() => expect(service.state.value).toEqual('success'), EXPECT_TIMEOUT);
});

const makeDestination = s => hexZeroPad(s, 32);
