import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine as createChannel} from '../create-and-fund';
import {machine as concludeChannel} from '../conclude-channel';

import {Store} from '../../store';
import {bigNumberify} from 'ethers/utils';

import {
  firstState,
  calculateChannelId,
  createSignatureEntry,
  outcomesEqual
} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';

import {add} from '../../utils';

import {
  wallet1,
  wallet2,
  participants,
  wallet3,
  ledgerState,
  first,
  third,
  second,
  TEST_SITE,
  budget
} from './data';

import {subscribeToMessages} from './message-service';

import {FakeChain} from '../../chain';
import {ETH_ASSET_HOLDER_ADDRESS, HUB} from '../../config';

import {SimpleHub} from './simple-hub';
import {TestStore} from './store';

jest.setTimeout(20000);

const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;

const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);

const destinations = participants.map(p => p.destination);

const ledgerChannel: ChannelConstants = {
  channelNonce: bigNumberify(1),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const amounts = [bigNumberify(7), bigNumberify(5)];
const ledgerAmounts = amounts.map(a => a.add(2));
const depositAmount = ledgerAmounts.reduce(add).toHexString();

const allocation: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const context: Init = {channelId: targetChannelId, funding: 'Direct'};

let aStore: TestStore;
let bStore: TestStore;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => createSignatureEntry(state, privateKey))
});

let chain: FakeChain;

const runUntilSuccess = async (machine, direct = true) => {
  const runMachine = (store: Store) => interpret(machine(store).withContext(context)).start();
  const services = [aStore, bStore].map(runMachine);
  const targetState = direct ? 'success' : {virtualDefunding: 'asLeaf'};

  await Promise.all(
    services.map(
      service =>
        new Promise(resolve =>
          service.onTransition(state => state.matches(targetState) && resolve())
        )
  ));
};

const createLedgerChannels = async () => {
  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  let signatures = [wallet1, wallet3].map(({privateKey}) =>
    createSignatureEntry(state, privateKey)
  );
  await aStore.createBudget(budget(bigNumberify(7), bigNumberify(7)));
  await bStore.createBudget(budget(bigNumberify(7), bigNumberify(7)));
  chain.depositSync(ledgerId, '0', depositAmount);
  await aStore.setLedgerByEntry(await aStore.createEntry({...state, signatures}));

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  signatures = [wallet2, wallet3].map(({privateKey}) => createSignatureEntry(state, privateKey));

  chain.depositSync(ledgerId, '0', depositAmount);
  await bStore.setLedgerByEntry(await bStore.createEntry({...state, signatures}));

  const [aService, bService] = [aStore, bStore].map((store: Store) =>
    interpret(createChannel(store).withContext({...context, funding: 'Virtual'})).start()
  );

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('success');
    expect(bService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);
};

beforeEach(async () => {
  chain = new FakeChain();
  aStore = new TestStore(chain);
  await aStore.initialize([wallet1.privateKey]);
  bStore = new TestStore(chain);
  await bStore.initialize([wallet2.privateKey]);
  const hubStore = new SimpleHub(wallet3.privateKey);

  [aStore, bStore].forEach(async (store: TestStore) => {
    await store.createEntry(allSignState(firstState(allocation, targetChannel)), {
      applicationSite: TEST_SITE
    });

    const ledgerEntry = await store.createEntry(
      allSignState(firstState(allocation, ledgerChannel))
    );
    await store.setLedgerByEntry(ledgerEntry);
  });

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore,
    [HUB.participantId]: hubStore
  });
});

it('reaches the same state when running conclude twice for direct funding', async () => {
  // Let A and B create and fund channel
  await runUntilSuccess(createChannel);

  // Both conclude the channel
  await runUntilSuccess(concludeChannel);
  const amountA1 = (await aStore.chain.getChainInfo(targetChannelId)).amount;
  const amountB1 = (await bStore.chain.getChainInfo(targetChannelId)).amount;

  // store entries should have been udpated to finalized state
  const entryA1 = await aStore.getEntry(targetChannelId);
  const entryB1 = await bStore.getEntry(targetChannelId);
  expect(entryA1.isFinalized).toBe(true);
  expect(entryB1.isFinalized).toBe(true);

  // Conclude again
  await runUntilSuccess(concludeChannel);
  const amountA2 = (await aStore.chain.getChainInfo(targetChannelId)).amount;
  const amountB2 = (await bStore.chain.getChainInfo(targetChannelId)).amount;

  const entryA2 = await aStore.getEntry(targetChannelId);
  const entryB2 = await bStore.getEntry(targetChannelId);

  expect(amountA2).toMatchObject(amountA1);
  expect(amountB2).toMatchObject(amountB1);

  // No change to the store entires, meaning that turnNum, etc. remain the same
  expect(entryA1).toMatchObject(entryA2);
  expect(entryB1).toMatchObject(entryB2);
});

it('reaches the same state when running conclude twice for virtual funding', async () => {
  await createLedgerChannels();

  // Both conclude the channel
  await runUntilSuccess(concludeChannel, false);
  const amountA1 = (await aStore.chain.getChainInfo(targetChannelId)).amount;
  const amountB1 = (await bStore.chain.getChainInfo(targetChannelId)).amount;

  // store entries should have been udpated to finalized state
  const entryA1 = await aStore.getEntry(targetChannelId);
  const entryB1 = await bStore.getEntry(targetChannelId);
  expect(entryA1.isFinalized).toBe(true);
  expect(entryB1.isFinalized).toBe(true);

  // Conclude again
  await runUntilSuccess(concludeChannel, false);
  const amountA2 = (await aStore.chain.getChainInfo(targetChannelId)).amount;
  const amountB2 = (await bStore.chain.getChainInfo(targetChannelId)).amount;

  const entryA2 = await aStore.getEntry(targetChannelId);
  const entryB2 = await bStore.getEntry(targetChannelId);

  expect(amountA2).toMatchObject(amountA1);
  expect(amountB2).toMatchObject(amountB1);

  expect(outcomesEqual(entryA1.latestState.outcome, entryA2.latestState.outcome)).toBe(true);
  expect(outcomesEqual(entryB1.latestState.outcome, entryB2.latestState.outcome)).toBe(true);
});
