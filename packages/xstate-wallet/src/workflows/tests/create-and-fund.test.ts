import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine} from '../create-and-fund';

import {Store} from '../../store';
import {BigNumber} from 'ethers';

import {firstState, calculateChannelId, createSignatureEntry} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from '@ethersproject/constants';
import {checkThat, isSimpleEthAllocation, add} from '../../utils';

import {
  wallet1,
  wallet2,
  participants,
  wallet3,
  ledgerState,
  first,
  third,
  second,
  TEST_APP_DOMAIN,
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
const challengeDuration = BigNumber.from(10);
const appDefinition = AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: BigNumber.from(0),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);

const ledgerChannel: ChannelConstants = {
  channelNonce: BigNumber.from(1),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const destinations = participants.map(p => p.destination);
const amounts = [BigNumber.from(7), BigNumber.from(5)];
const totalAmount = amounts.reduce((a, b) => a.add(b));

const allocation: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const ledgerAmounts = amounts.map(a => a.add(2));
const depositAmount = ledgerAmounts.reduce(add).toHexString();

const context: Init = {channelId: targetChannelId, funding: 'Direct'};

let aStore: TestStore;
let bStore: TestStore;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => createSignatureEntry(state, privateKey))
});

let chain: FakeChain;

beforeEach(async () => {
  chain = new FakeChain();
  aStore = new TestStore(chain);
  await aStore.initialize([wallet1.privateKey]);
  bStore = new TestStore(chain);
  await bStore.initialize([wallet2.privateKey]);
  const hubStore = new SimpleHub(wallet3.privateKey);

  [aStore, bStore].forEach(async (store: TestStore) => {
    await store.createEntry(allSignState(firstState(allocation, targetChannel)), {
      applicationDomain: TEST_APP_DOMAIN
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

test('it uses direct funding when told', async () => {
  const connectToStore = (store: Store) => interpret(machine(store).withContext(context)).start();
  const [aService, bService] = [aStore, bStore].map(connectToStore);

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);

  const {supported: supportedState} = await aStore.getEntry(targetChannelId);
  const outcome = checkThat(supportedState.outcome, isSimpleEthAllocation);

  expect(outcome).toMatchObject(allocation);
  expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({type: 'Direct'});
  expect((await aStore.chain.getChainInfo(targetChannelId)).amount).toMatchObject(totalAmount);
});

test('it uses virtual funding when enabled', async () => {
  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  let signatures = [wallet1, wallet3].map(({privateKey}) =>
    createSignatureEntry(state, privateKey)
  );
  await aStore.createBudget(budget(BigNumber.from(7), BigNumber.from(7)));
  await bStore.createBudget(budget(BigNumber.from(7), BigNumber.from(7)));
  chain.depositSync(ledgerId, '0', depositAmount);
  await aStore.setLedgerByEntry(await aStore.createEntry({...state, signatures}));

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  signatures = [wallet2, wallet3].map(({privateKey}) => createSignatureEntry(state, privateKey));

  chain.depositSync(ledgerId, '0', depositAmount);
  await bStore.setLedgerByEntry(await bStore.createEntry({...state, signatures}));

  const [aService, bService] = [aStore, bStore].map((store: Store) =>
    interpret(machine(store).withContext({...context, funding: 'Virtual'})).start()
  );

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('success');
    expect(bService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);

  const {supported: supportedState} = await aStore.getEntry(targetChannelId);
  const outcome = checkThat(supportedState.outcome, isSimpleEthAllocation);

  expect(outcome).toMatchObject(allocation);
  expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({type: 'Virtual'});

  // Verify the budgets are allocated to the channel
  const aBudget = await aStore.getBudget(TEST_APP_DOMAIN);
  const aChannelAmount =
    aBudget?.forAsset[ETH_ASSET_HOLDER_ADDRESS]?.channels[targetChannelId].amount;
  expect(aChannelAmount?.toHexString()).toEqual(totalAmount.toHexString());

  const bBudget = await bStore.getBudget(TEST_APP_DOMAIN);
  const bChannelAmount =
    bBudget?.forAsset[ETH_ASSET_HOLDER_ADDRESS]?.channels[targetChannelId].amount;
  expect(bChannelAmount?.toHexString()).toEqual(totalAmount.toHexString());
});
