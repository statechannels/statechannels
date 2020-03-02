import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine, Role} from '../virtualFunding';

import {MemoryStore} from '../../store/memory-store';
import {DumbHub} from './dumb-hub';
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
  {destination: jointParticipants[0].destination, amount: amounts[0]},
  {destination: jointParticipants[2].destination, amount: amounts[1]},
  {destination: jointParticipants[1].destination, amount: amounts.reduce(add)}
]);

const context: Init = {targetChannelId, jointChannelId};

test('virtual funding', async () => {
  const hubStore = new MemoryStore([wallet3.privateKey]);
  const aStore = new MemoryStore([wallet1.privateKey]);
  const bStore = new MemoryStore([wallet2.privateKey]);

  const hubService = interpret(machine(hubStore, context, Role.Hub));
  const aService = interpret(machine(aStore, context, Role.A));
  const bService = interpret(machine(bStore, context, Role.B));
  const services = [aService, hubService, bService];

  [aStore, hubStore, bStore].forEach((store: MemoryStore) => {
    const state = firstState(outcome, jointChannel);
    store.pushMessage({
      signedStates: [{...state, signatures: [signState(state, wallet1.privateKey)]}]
    });
  });
  await Promise.all(
    [aStore, hubStore].map(async (store: MemoryStore) => {
      const state = ledgerState([first, third], [1, 3]);
      const signatures = [wallet1, wallet3].map(({privateKey}) => signState(state, privateKey));
      store.pushMessage({signedStates: [{...state, signatures}]});
      store.setLedger((await store.getEntry(calculateChannelId(state))) as MemoryChannelStoreEntry);
    })
  );
  await Promise.all(
    [bStore, hubStore].map(async (store: MemoryStore) => {
      const state = ledgerState([second, third], [1, 3]);
      const signatures = [wallet2, wallet3].map(({privateKey}) => signState(state, privateKey));
      store.pushMessage({signedStates: [{...state, signatures}]});
      store.setLedger((await store.getEntry(calculateChannelId(state))) as MemoryChannelStoreEntry);
    })
  );

  subscribeToMessages({
    [jointParticipants[0].participantId]: aStore,
    [jointParticipants[1].participantId]: hubStore,
    [jointParticipants[2].participantId]: bStore
  });

  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(hubService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported} = await aStore.getEntry(jointChannelId);
    const outcome = supported?.outcome;
    const amount = bigNumberify(5);
    expect(outcome).toMatchObject(
      simpleEthAllocation([
        {destination: targetChannelId, amount},
        {destination: jointParticipants[1].destination, amount}
      ])
    );
  }, EXPECT_TIMEOUT);
});

test('virtual funding with a dumb hub', async () => {
  const aStore = new MemoryStore([wallet1.privateKey]);
  const bStore = new MemoryStore([wallet2.privateKey]);
  const hubStore = new DumbHub(wallet3.privateKey);

  const aService = interpret(machine(aStore, context, Role.A));
  const bService = interpret(machine(bStore, context, Role.B));
  const services = [aService, bService];

  [aStore, bStore].forEach((store: MemoryStore) => {
    const state = firstState(outcome, jointChannel);
    store.pushMessage({
      signedStates: [{...state, signatures: [signState(state, wallet1.privateKey)]}]
    });
  });
  {
    const state = ledgerState([first, third], [1, 3]);
    const signatures = [wallet1, wallet3].map(({privateKey}) => signState(state, privateKey));
    aStore.pushMessage({signedStates: [{...state, signatures}]});
    aStore.setLedger((await aStore.getEntry(calculateChannelId(state))) as MemoryChannelStoreEntry);
  }
  {
    const state = ledgerState([second, third], [1, 3]);
    const signatures = [wallet2, wallet3].map(({privateKey}) => signState(state, privateKey));
    bStore.pushMessage({signedStates: [{...state, signatures}]});
    bStore.setLedger((await bStore.getEntry(calculateChannelId(state))) as MemoryChannelStoreEntry);
  }

  subscribeToMessages({
    [jointParticipants[0].participantId]: aStore,
    [jointParticipants[2].participantId]: bStore,
    [jointParticipants[1].participantId]: hubStore
  });

  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported} = await aStore.getEntry(jointChannelId);
    const outcome = supported?.outcome;
    const amount = bigNumberify(5);
    expect(outcome).toMatchObject(
      simpleEthAllocation([
        {destination: targetChannelId, amount},
        {destination: jointParticipants[1].destination, amount}
      ])
    );
  }, EXPECT_TIMEOUT);
});

test('invalid joint state', async () => {
  const store = new MemoryStore([wallet1.privateKey]);
  const service = interpret(machine(store, context, Role.A)).start();

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
