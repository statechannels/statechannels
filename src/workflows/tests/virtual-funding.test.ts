import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {MemoryStore} from '../../store/memory-store';
import {SimpleHub} from './simple-hub';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {add} from '../../utils/math-utils';
import {simpleEthAllocation} from '../../utils/outcome';

import {
  wallet1,
  wallet2,
  wallet3,
  participants as targetParticipants,
  threeParticipants as jointParticipants,
  ledgerState,
  first,
  second,
  third
} from './data';
import {subscribeToMessages} from './message-service';
import {MemoryChannelStoreEntry} from '../../store/memory-channel-storage';
import {ParticipantIdx} from '../virtual-funding-as-leaf';
import {VirtualFundingAsLeaf, VirtualFundingAsHub} from '..';
import {FakeChain} from '../../chain';

jest.setTimeout(20000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;
const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants: targetParticipants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);
const jointChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants: jointParticipants,
  appDefinition
};
const jointChannelId = calculateChannelId(jointChannel);

const amounts = [bigNumberify(2), bigNumberify(3)];
const outcome: Outcome = simpleEthAllocation([
  {destination: jointParticipants[ParticipantIdx.A].destination, amount: amounts[0]},
  {destination: jointParticipants[ParticipantIdx.Hub].destination, amount: amounts.reduce(add)},
  {destination: jointParticipants[ParticipantIdx.B].destination, amount: amounts[1]}
]);

const context: VirtualFundingAsLeaf.Init = {targetChannelId, jointChannelId};

const ledgerAmounts = [4, 4].map(bigNumberify);
const depositAmount = ledgerAmounts.reduce(add).toHexString();
let hubStore: MemoryStore;
let aStore: MemoryStore;
let bStore: MemoryStore;
let chain: FakeChain;

beforeEach(() => {
  chain = new FakeChain();
  hubStore = new MemoryStore([wallet3.privateKey], chain);
  aStore = new MemoryStore([wallet1.privateKey], chain);
  bStore = new MemoryStore([wallet2.privateKey], chain);
});

test('virtual funding with smart hub', async () => {
  const hubService = interpret(VirtualFundingAsHub.machine(hubStore).withContext(context));
  const aService = interpret(VirtualFundingAsLeaf.machine(aStore).withContext(context));
  const bService = interpret(VirtualFundingAsLeaf.machine(bStore).withContext(context));
  const services = [aService, hubService, bService];

  [aStore, hubStore, bStore].forEach((store: MemoryStore) => {
    const state = firstState(outcome, jointChannel);
    store.pushMessage({
      signedStates: [{...state, signatures: [signState(state, wallet1.privateKey)]}]
    });
  });

  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  chain.depositSync(ledgerId, '0', depositAmount);
  await Promise.all(
    [aStore, hubStore].map(async (store: MemoryStore) => {
      const signatures = [wallet1, wallet3].map(({privateKey}) => signState(state, privateKey));
      store.pushMessage({signedStates: [{...state, signatures}]});
      store.setLedger((await store.getEntry(ledgerId)) as MemoryChannelStoreEntry);
    })
  );

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  chain.depositSync(ledgerId, '0', depositAmount);
  await Promise.all(
    [bStore, hubStore].map(async (store: MemoryStore) => {
      const signatures = [wallet2, wallet3].map(({privateKey}) => signState(state, privateKey));
      store.pushMessage({signedStates: [{...state, signatures}]});
      store.setLedger((await store.getEntry(ledgerId)) as MemoryChannelStoreEntry);
    })
  );

  subscribeToMessages({
    [jointParticipants[ParticipantIdx.A].participantId]: aStore,
    [jointParticipants[ParticipantIdx.Hub].participantId]: hubStore,
    [jointParticipants[ParticipantIdx.B].participantId]: bStore
  });

  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(hubService.state.value).toEqual('success');
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported: supportedState} = await aStore.getEntry(jointChannelId);
    const outcome = supportedState.outcome;
    const amount = bigNumberify(5);
    expect(outcome).toMatchObject(
      simpleEthAllocation([
        {destination: targetChannelId, amount},
        {destination: jointParticipants[ParticipantIdx.Hub].destination, amount}
      ])
    );
  }, EXPECT_TIMEOUT);
});

test('virtual funding with a simple hub', async () => {
  const hubStore = new SimpleHub(wallet3.privateKey);

  const aService = interpret(VirtualFundingAsLeaf.machine(aStore).withContext(context));
  const bService = interpret(VirtualFundingAsLeaf.machine(bStore).withContext(context));
  const services = [aService, bService];

  [aStore, bStore].forEach((store: MemoryStore) => {
    const state = firstState(outcome, jointChannel);
    store.pushMessage({
      signedStates: [{...state, signatures: [signState(state, wallet1.privateKey)]}]
    });
  });

  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  let signatures = [wallet1, wallet3].map(({privateKey}) => signState(state, privateKey));

  chain.depositSync(ledgerId, '0', depositAmount);
  aStore.pushMessage({signedStates: [{...state, signatures}]});
  aStore.setLedger((await aStore.getEntry(calculateChannelId(state))) as MemoryChannelStoreEntry);

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  signatures = [wallet2, wallet3].map(({privateKey}) => signState(state, privateKey));

  chain.depositSync(ledgerId, '0', depositAmount);
  bStore.pushMessage({signedStates: [{...state, signatures}]});
  bStore.setLedger((await bStore.getEntry(calculateChannelId(state))) as MemoryChannelStoreEntry);

  subscribeToMessages({
    [jointParticipants[ParticipantIdx.A].participantId]: aStore,
    [jointParticipants[ParticipantIdx.B].participantId]: bStore,
    [jointParticipants[ParticipantIdx.Hub].participantId]: hubStore
  });

  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    {
      // Check a ledger channel's current outcome
      const {supported: supportedState} = await aStore.getLedger(
        jointParticipants[ParticipantIdx.Hub].participantId
      );
      expect(supportedState.outcome).toMatchObject(
        simpleEthAllocation([
          {
            destination: jointParticipants[ParticipantIdx.A].destination,
            amount: ledgerAmounts[0].sub(amounts[0])
          },
          {
            destination: jointParticipants[ParticipantIdx.Hub].destination,
            amount: ledgerAmounts[1].sub(amounts[1])
          },
          // We don't know the guarantor channel id
          {destination: expect.any(String), amount: amounts.reduce(add)}
        ])
      );
    }

    {
      // Check the joint channel's current outcome
      const {outcome} = (await aStore.getEntry(jointChannelId)).supported;
      const amount = bigNumberify(5);
      expect(outcome).toMatchObject(
        simpleEthAllocation([
          {destination: targetChannelId, amount},
          {destination: jointParticipants[ParticipantIdx.Hub].destination, amount}
        ])
      );
    }
  }, EXPECT_TIMEOUT);
});

test('invalid joint state', async () => {
  const store = new MemoryStore([wallet1.privateKey]);
  const service = interpret(VirtualFundingAsLeaf.machine(store).withContext(context), {
    parent: {send: () => undefined} as any // Limits console noise
  }).start();

  const state = firstState(outcome, jointChannel);
  const invalidState: State = {
    ...state,
    outcome: simpleEthAllocation([])
  };

  store.pushMessage({
    signedStates: [{...invalidState, signatures: [signState(invalidState, wallet1.privateKey)]}]
  });

  await waitForExpect(() => expect(service.state.value).toEqual('failure'), EXPECT_TIMEOUT);
});
