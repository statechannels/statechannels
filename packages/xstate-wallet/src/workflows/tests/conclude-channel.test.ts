import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine} from '../create-and-fund';

import {Store} from '../../store';
import {bigNumberify} from 'ethers/utils';

import {firstState, calculateChannelId, createSignatureEntry} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {machine as concludeChannelMachine} from '../conclude-channel';

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

it('is idempoent when concluding twice', async () => {
  const connectToStore = (store: Store) => interpret(machine(store).withContext(context)).start();
  const [aService, bService] = [aStore, bStore].map(connectToStore);

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);

  // Inject service.stop() when A concludes and  A restarts concluding

  interpret(concludeChannelMachine(aStore)).start();
  interpret(concludeChannelMachine(bStore)).start();

  // Assert expected states
});
