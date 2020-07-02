import {interpret} from 'xstate';

import {Store, SignedState} from '@statechannels/wallet-core/lib/src/store';

import {
  firstState,
  calculateChannelId,
  createSignatureEntry
} from '@statechannels/wallet-core/lib/src/store/state-utils';
import {ChannelConstants, Outcome, State} from '@statechannels/wallet-core/lib/src/store/types';
import {AddressZero, Zero} from '@ethersproject/constants';

import {FakeChain} from '@statechannels/wallet-core/lib/src/chain';
import {TestStore} from '@statechannels/wallet-core/lib/src/test-store';
import {BigNumber} from 'ethers';
import {wallet1, wallet2, participants, TEST_APP_DOMAIN} from './data';

import {subscribeToMessages} from './message-service';

import {ETH_ASSET_HOLDER_ADDRESS} from '../../config';

import {machine as concludeChannel} from '../conclude-channel';
import {Init, machine as createChannel} from '../create-and-fund';

jest.setTimeout(5000);

const chainId = '0x01';
const challengeDuration = BigNumber.from(10);
const appDefinition = AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: Zero,
  chainId,
  challengeDuration,
  participants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);

const destinations = participants.map(p => p.destination);

const amounts = [BigNumber.from(7), BigNumber.from(5)];

const allocation: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const context: Init = {channelId: targetChannelId, funding: 'Direct'};

const allSignedState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => createSignatureEntry(state, privateKey))
});

const ASignedStateOnly = (state: State) => ({
  ...state,
  signatures: [createSignatureEntry(state, wallet1.privateKey)]
});

const BSignedStateOnly = (state: State) => ({
  ...state,
  signatures: [createSignatureEntry(state, wallet2.privateKey)]
});

const noSignedState = (state: State) => ({
  ...state,
  signatures: []
});

const runUntilSuccess = async (machine, stores: Array<TestStore>) => {
  const runMachine = (store: Store) => interpret(machine(store).withContext(context)).start();
  const services = stores.map(runMachine);

  await Promise.all(
    services.map(
      service =>
        new Promise(resolve =>
          service.onTransition(state => state.matches('success') && service.stop() && resolve())
        )
    )
  );
};

const concludeAndAssert = async (stores: Array<TestStore>) => {
  const [aStore, bStore] = stores;
  // Both conclude the channel
  await runUntilSuccess(concludeChannel, stores);

  // store entries should have been udpated to finalized state
  const entryA1 = await aStore.getEntry(targetChannelId);
  const entryB1 = await bStore.getEntry(targetChannelId);
  expect(entryA1.hasConclusionProof).toBe(true);
  expect(entryB1.hasConclusionProof).toBe(true);
};

const setupStores = async (entryState: SignedState) => {
  const chain = new FakeChain();
  const aStore = new TestStore(chain);
  await aStore.initialize([wallet1.privateKey]);
  const bStore = new TestStore(chain);
  await bStore.initialize([wallet2.privateKey]);
  await aStore.createEntry(entryState, {
    applicationDomain: TEST_APP_DOMAIN
  });
  await bStore.createEntry(entryState, {
    applicationDomain: TEST_APP_DOMAIN
  });

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore
  });

  return [aStore, bStore];
};

const finalState = (outcome, targetChannel) => ({
  ...firstState(outcome, targetChannel),
  isFinal: true
});

//TODO: Re-enable these tests
// https://github.com/statechannels/monorepo/issues/1831

describe('supportState machine is idempotent', () => {
  // eslint-disable-next-line jest/expect-expect
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('concludes correctly when starting with all signed states', async () => {
    const entryState = allSignedState(finalState(allocation, targetChannel));

    const stores = await setupStores(entryState);

    await runUntilSuccess(createChannel, stores);
    await concludeAndAssert(stores);
  });

  // eslint-disable-next-line jest/expect-expect
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('concludes correctly when starting with A signed state only', async () => {
    const entryState = ASignedStateOnly(finalState(allocation, targetChannel));

    const stores = await setupStores(entryState);

    await runUntilSuccess(createChannel, stores);
    await concludeAndAssert(stores);
  });

  // eslint-disable-next-line jest/expect-expect
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('concludes correctly when starting with B signed state only', async () => {
    const entryState = BSignedStateOnly(finalState(allocation, targetChannel));

    const stores = await setupStores(entryState);

    await runUntilSuccess(createChannel, stores);
    await concludeAndAssert(stores);
  });

  // eslint-disable-next-line jest/expect-expect
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('concludes correctly when starting with no signed state', async () => {
    const entryState = noSignedState(finalState(allocation, targetChannel));

    const stores = await setupStores(entryState);

    await runUntilSuccess(createChannel, stores);
    await concludeAndAssert(stores);
  });
});
