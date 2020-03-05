import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine} from '../create-and-fund';

import {MemoryStore, Store} from '../../store/memory-store';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {checkThat} from '../../utils';
import {isSimpleEthAllocation} from '../../utils/outcome';
import {wallet1, wallet2, participants} from './data';
import {subscribeToMessages} from './message-service';
import {ETH_ASSET_HOLDER_ADDRESS} from '../../constants';
import {FakeChain, Chain} from '../../chain';

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

const context: Init = {
  channelId: targetChannelId,
  allocation,
  appDefinition: AddressZero,
  appData: '0x'
};

let aStore: MemoryStore;
let bStore: MemoryStore;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => signState(state, privateKey))
});

beforeEach(() => {
  const chain: Chain = new FakeChain();
  aStore = new MemoryStore([wallet1.privateKey], chain);
  bStore = new MemoryStore([wallet2.privateKey], chain);

  const message = {
    signedStates: [
      allSignState(firstState(allocation, targetChannel)),
      allSignState(firstState(allocation, ledgerChannel))
    ]
  };
  [aStore, bStore].forEach((store: Store) => store.pushMessage(message));

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore
  });
});

const connectToStore = (store: Store) => interpret(machine(store).withContext(context)).start();
test('it uses direct funding when there is no budget', async () => {
  const [aService, bService] = [aStore, bStore].map(connectToStore);

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported} = await aStore.getEntry(targetChannelId);
    const outcome = checkThat(supported?.outcome, isSimpleEthAllocation);

    expect(outcome).toMatchObject(allocation);
    expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({type: 'Direct'});
    expect(await (await aStore.chain.getChainInfo(targetChannelId)).amount).toMatchObject(
      totalAmount
    );
  }, EXPECT_TIMEOUT);
});

test('it uses virtual funding when there is a budget', async () => {
  [aStore, bStore].map(store => store.setBudget(appDefinition, true));
  const [aService, bService] = [aStore, bStore].map(connectToStore);

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('virtualFunding');
    expect(bService.state.value).toEqual('virtualFunding');

    const {supported} = await aStore.getEntry(targetChannelId);
    const outcome = checkThat(supported?.outcome, isSimpleEthAllocation);

    expect(outcome).toMatchObject(allocation);
    // expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({type: 'Virtual'});
  }, EXPECT_TIMEOUT);
});
