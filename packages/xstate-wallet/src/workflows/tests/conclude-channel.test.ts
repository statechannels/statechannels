import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine as createChannel} from '../create-and-fund';
import {machine as concludeChannel} from '../conclude-channel';

import {Store} from '../../store';
import {bigNumberify} from 'ethers/utils';

import {firstState, calculateChannelId, createSignatureEntry} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';

import {wallet1, wallet2, participants, wallet3, TEST_SITE} from './data';
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
const amounts = [bigNumberify(7), bigNumberify(5)];

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

const runUntilSuccess = async machine => {
  const runMachine = (store: Store) => interpret(machine(store).withContext(context)).start();
  const [aService, bService] = [aStore, bStore].map(runMachine);

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');
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
  });

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore,
    [HUB.participantId]: hubStore
  });
});

it('reaches the same state when running conclude twice', async () => {
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
