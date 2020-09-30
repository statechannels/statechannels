import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';
import {
  firstState,
  createSignatureEntry,
  calculateChannelId,
  ChannelConstants,
  Outcome,
  State,
  simpleEthAllocation,
  makeDestination,
  simpleEthGuarantee,
  BN
} from '@statechannels/wallet-core';
import {constants} from 'ethers';

import {FakeChain} from '../../chain';
import {TestStore} from '../../test-store';
import {ParticipantIdx} from '../virtual-funding-as-leaf';

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
import {SimpleHub} from './simple-hub';

import {VirtualFundingAsLeaf, VirtualFundingAsHub} from '..';
const {add, sub: subtract} = BN;

jest.setTimeout(20000);

const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;
const chainId = '0x01';
const challengeDuration = 10;
const appDefinition = constants.AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: 0,
  chainId,
  challengeDuration,
  participants: targetParticipants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);
const jointChannel: ChannelConstants = {
  channelNonce: 0,
  chainId,
  challengeDuration,
  participants: jointParticipants,
  appDefinition
};
const jointChannelId = calculateChannelId(jointChannel);

const amounts = [BN.from(2), BN.from(3)];
const outcome: Outcome = simpleEthAllocation([
  {destination: jointParticipants[ParticipantIdx.A].destination, amount: amounts[0]},
  {destination: jointParticipants[ParticipantIdx.Hub].destination, amount: amounts.reduce(add)},
  {destination: jointParticipants[ParticipantIdx.B].destination, amount: amounts[1]}
]);

const context: VirtualFundingAsLeaf.Init = {targetChannelId, jointChannelId};
const hubContext: VirtualFundingAsHub.Init = {
  ...context,
  [ParticipantIdx.A]: {},
  [ParticipantIdx.B]: {}
};

const ledgerAmounts = [4, 4].map(BN.from);
const depositAmount = ledgerAmounts.reduce(add);
let hubStore: TestStore;
let aStore: TestStore;
let bStore: TestStore;
let chain: FakeChain;

beforeEach(async () => {
  chain = new FakeChain();
  hubStore = new TestStore(chain);
  await hubStore.initialize([wallet3.privateKey]);
  aStore = new TestStore(chain);
  await aStore.initialize([wallet1.privateKey]);
  bStore = new TestStore(chain);
  await bStore.initialize([wallet2.privateKey]);
});

test('virtual funding with smart hub', async () => {
  const hubService = interpret(VirtualFundingAsHub.machine(hubStore).withContext(hubContext));
  const aService = interpret(VirtualFundingAsLeaf.machine(aStore).withContext(context));
  const bService = interpret(VirtualFundingAsLeaf.machine(bStore).withContext(context));
  const services = [aService, hubService, bService];

  [aStore, hubStore, bStore].forEach(async (store: TestStore) => {
    const state = firstState(outcome, jointChannel);
    await store.createEntry({
      ...state,
      signatures: [createSignatureEntry(state, wallet1.privateKey)]
    });
  });

  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  chain.depositSync(ledgerId, '0', depositAmount);
  await Promise.all(
    [aStore, hubStore].map(async (store: TestStore) => {
      const signatures = [wallet1, wallet3].map(({privateKey}) =>
        createSignatureEntry(state, privateKey)
      );
      await store.setLedgerByEntry(await store.createEntry({...state, signatures}));
    })
  );

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  chain.depositSync(ledgerId, '0', depositAmount);
  await Promise.all(
    [bStore, hubStore].map(async (store: TestStore) => {
      const signatures = [wallet2, wallet3].map(({privateKey}) =>
        createSignatureEntry(state, privateKey)
      );
      await store.setLedgerByEntry(await store.createEntry({...state, signatures}));
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
    const amount = BN.from(5);
    expect(outcome).toMatchObject(
      simpleEthAllocation([
        {destination: makeDestination(targetChannelId), amount},
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

  [aStore, bStore].forEach(async (store: TestStore) => {
    const state = firstState(outcome, jointChannel);
    await store.createEntry({
      ...state,
      signatures: [createSignatureEntry(state, wallet1.privateKey)]
    });
  });

  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  let signatures = [wallet1, wallet3].map(({privateKey}) =>
    createSignatureEntry(state, privateKey)
  );

  chain.depositSync(ledgerId, '0', depositAmount);
  await aStore.setLedgerByEntry(await aStore.createEntry({...state, signatures}));

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  signatures = [wallet2, wallet3].map(({privateKey}) => createSignatureEntry(state, privateKey));

  chain.depositSync(ledgerId, '0', depositAmount);
  await bStore.setLedgerByEntry(await bStore.createEntry({...state, signatures}));

  subscribeToMessages({
    [jointParticipants[ParticipantIdx.A].participantId]: aStore,
    [jointParticipants[ParticipantIdx.B].participantId]: bStore,
    [jointParticipants[ParticipantIdx.Hub].participantId]: hubStore
  });

  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);
  let guarantorChannelId;
  {
    // Inspect the ledger entry
    const {supported: supportedState} = await aStore.getLedger(
      jointParticipants[ParticipantIdx.Hub].participantId
    );
    // The virtual-funding workflow does not touch the ledger channel's funding status
    expect(supportedState.outcome).toMatchObject(
      simpleEthAllocation([
        {
          destination: jointParticipants[ParticipantIdx.A].destination,
          amount: subtract(ledgerAmounts[0], amounts[0])
        },
        {
          destination: jointParticipants[ParticipantIdx.Hub].destination,
          amount: subtract(ledgerAmounts[1], amounts[1])
        },
        // We don't know the guarantor channel id
        {destination: expect.any(String), amount: amounts.reduce(add)}
      ])
    );
    guarantorChannelId = (supportedState.outcome as any).allocationItems[2].destination;
  }

  {
    // Inspect the joint entry
    const {supported, funding} = await aStore.getEntry(jointChannelId);
    expect(funding).toEqual({type: 'Guarantee', guarantorChannelId: expect.any(String)});
    guarantorChannelId = (funding as any).guarantorChannelId;

    const amount = BN.from(5);
    expect(supported.outcome).toMatchObject(
      simpleEthAllocation([
        {destination: makeDestination(targetChannelId), amount},
        {destination: jointParticipants[ParticipantIdx.Hub].destination, amount}
      ])
    );
  }

  {
    // Inspect the guarantor entry
    const {supported, funding} = await aStore.getEntry(guarantorChannelId);
    expect(funding).toEqual({type: 'Indirect', ledgerId: expect.any(String)});
    expect(supported.outcome).toMatchObject(
      simpleEthGuarantee(
        jointChannelId,
        targetChannelId,
        jointParticipants[ParticipantIdx.A].destination,
        jointParticipants[ParticipantIdx.Hub].destination
      )
    );
  }
});

test('invalid joint state', async () => {
  const store = new TestStore();
  await store.initialize([wallet1.privateKey]);
  const service = interpret(VirtualFundingAsLeaf.machine(store).withContext(context), {
    parent: {send: () => undefined} as any // Limits console noise
  }).start();

  const state = firstState(outcome, jointChannel);
  const invalidState: State = {
    ...state,
    outcome: simpleEthAllocation([])
  };

  await store.pushMessage({
    signedStates: [
      {
        ...invalidState,

        signatures: [createSignatureEntry(invalidState, wallet1.privateKey)]
      }
    ]
  });

  await waitForExpect(() => expect(service.state.value).toEqual('failure'), EXPECT_TIMEOUT);
});
