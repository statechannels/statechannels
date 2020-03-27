import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine} from '../create-and-fund';

import {Store} from '../../store';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {checkThat} from '../../utils';
import {isSimpleEthAllocation} from '../../utils/outcome';
import {
  wallet1,
  wallet2,
  participants,
  wallet3,
  ledgerState,
  first,
  third,
  second,
  TEST_SITE
} from './data';
import {subscribeToMessages} from './message-service';
import {ETH_ASSET_HOLDER_ADDRESS, HUB} from '../../constants';
import {FakeChain} from '../../chain';
import {SimpleHub} from './simple-hub';
import {add} from '../../utils/math-utils';
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

const ledgerChannel: ChannelConstants = {
  channelNonce: bigNumberify(1),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const destinations = participants.map(p => p.destination);
const amounts = [bigNumberify(7), bigNumberify(5)];
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

const context: Init = {channelId: targetChannelId, allocation};

let aStore: TestStore;
let bStore: TestStore;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => signState(state, privateKey))
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

const connectToStore = (store: Store) => interpret(machine(store).withContext(context)).start();
test('it uses direct funding when process.env.USE_VIRTUAL_FUNDING is undefined', async () => {
  delete process.env.USE_VIRTUAL_FUNDING;
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
  process.env.USE_VIRTUAL_FUNDING = 'true';

  let state = ledgerState([first, third], ledgerAmounts);
  let ledgerId = calculateChannelId(state);
  let signatures = [wallet1, wallet3].map(({privateKey}) => signState(state, privateKey));
  // await aStore.createBudget(budget(bigNumberify(7), bigNumberify(3)));
  // await bStore.createBudget(budget(bigNumberify(7), bigNumberify(3)));
  chain.depositSync(ledgerId, '0', depositAmount);
  await aStore.setLedgerByEntry(await aStore.createEntry({...state, signatures}));

  state = ledgerState([second, third], ledgerAmounts);
  ledgerId = calculateChannelId(state);
  signatures = [wallet2, wallet3].map(({privateKey}) => signState(state, privateKey));

  chain.depositSync(ledgerId, '0', depositAmount);
  await bStore.setLedgerByEntry(await bStore.createEntry({...state, signatures}));

  const [aService, bService] = [aStore, bStore].map(connectToStore);

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('success');
    expect(bService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);

  const {supported: supportedState} = await aStore.getEntry(targetChannelId);
  const outcome = checkThat(supportedState.outcome, isSimpleEthAllocation);

  expect(outcome).toMatchObject(allocation);
  expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({type: 'Virtual'});

  delete process.env.USE_VIRTUAL_FUNDING;
});
