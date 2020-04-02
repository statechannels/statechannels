import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';
import {add, checkThat, isSimpleEthAllocation} from '../../utils';

import {Init, machine, Errors} from '../ledger-funding';

import {Store} from '../../store';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, calculateChannelId, createSignatureEntry} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';

import {FakeChain, Chain} from '../../chain';
import {wallet1, wallet2, participants} from './data';
import {subscribeToMessages} from './message-service';
import {ETH_ASSET_HOLDER_ADDRESS} from '../../constants';
import {TestStore} from './store';
import {Guid} from 'guid-typescript';

jest.setTimeout(10000);
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
const ledgerChannelId = calculateChannelId(ledgerChannel);

const destinations = participants.map(p => p.destination);
const amounts = [bigNumberify(7), bigNumberify(5)];
const deductionAmounts = [bigNumberify(3), bigNumberify(2)];
const outcome: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};
const deductions = [0, 1].map(i => ({
  destination: destinations[i],
  amount: deductionAmounts[i]
}));

const context: Init = {targetChannelId, ledgerChannelId, deductions};

let chain: Chain;
let aStore: TestStore;
let bStore: TestStore;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => createSignatureEntry(state, privateKey))
});

beforeEach(async () => {
  aStore = new TestStore(chain);
  await aStore.initialize([wallet1.privateKey]);
  bStore = new TestStore(chain);
  await bStore.initialize([wallet2.privateKey]);

  [aStore, bStore].forEach(async (store: TestStore) => {
    await store.createEntry(allSignState(firstState(outcome, targetChannel)));
    await store.setLedgerByEntry(
      await store.createEntry(allSignState(firstState(outcome, ledgerChannel)))
    );
  });

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore
  });
});

test('happy path', async () => {
  const _chain = new FakeChain();
  _chain.depositSync(ledgerChannelId, '0', amounts.reduce(add).toHexString());
  [aStore, bStore].forEach((store: Store) => (store.chain = _chain));

  const aService = interpret(machine(aStore).withContext(context));

  const bService = interpret(machine(bStore).withContext(context));
  [aService, bService].map(s => s.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported: supportedState} = await aStore.getEntry(ledgerChannelId);
    const outcome = checkThat(supportedState.outcome, isSimpleEthAllocation);

    expect(outcome.allocationItems).toMatchObject(
      [0, 1]
        .map(i => ({
          destination: destinations[i],
          amount: amounts[i].sub(deductionAmounts[i])
        }))
        .concat([{destination: targetChannelId as any, amount: deductionAmounts.reduce(add)}])
    );

    expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({
      type: 'Indirect',
      ledgerId: ledgerChannelId
    });
  }, EXPECT_TIMEOUT);
});

test('locks', async () => {
  const _chain = new FakeChain();
  _chain.depositSync(ledgerChannelId, '0', amounts.reduce(add).toHexString());
  [aStore, bStore].forEach((store: TestStore) => ((store as any).chain = _chain));

  const aService = interpret(machine(aStore).withContext(context));
  const bService = interpret(machine(bStore).withContext(context));
  // Note: We need player B to block on the lock since technically
  // if player B signs state 1 then state 1 is supported and it won't block
  // waiting for player A
  const status = await bStore.acquireChannelLock(context.ledgerChannelId);
  expect(status).toEqual({
    channelId: context.ledgerChannelId,
    lock: expect.any(Guid)
  });

  [aService, bService].map(s => s.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('acquiringLock');
    expect(aService.state.value).toEqual({fundingTarget: 'supportState'});
  }, EXPECT_TIMEOUT);

  aService.onTransition(s => {
    if (_.isEqual(s.value, {fundTarget: 'getTargetOutcome'})) {
      expect((s.context as any).lock).toBeDefined();
      expect((s.context as any).lock).not.toEqual(status.lock);
    }
  });
  await bStore.releaseChannelLock(status);

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);

  expect(bStore._channelLocks[context.ledgerChannelId]).toBeUndefined();
});

const twelveTotalAllocated = outcome;
const fiveTotalAllocated: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: deductionAmounts[i].sub(1)
  }))
};

test.each`
  description         | ledgerOutcome           | chainInfo            | error
  ${'underfunded'}    | ${twelveTotalAllocated} | ${{amount: '1'}}     | ${Errors.underfunded}
  ${'underallocated'} | ${fiveTotalAllocated}   | ${undefined}         | ${Errors.underallocated}
  ${'finalized'}      | ${twelveTotalAllocated} | ${{finalized: true}} | ${Errors.finalized}
`('failure mode: $description', async ({ledgerOutcome, error, chainInfo}) => {
  const _chain = new FakeChain();
  _chain.depositSync(ledgerChannelId, '0', chainInfo?.amount || '12');
  chainInfo?.finalized && _chain.finalizeSync(ledgerChannelId);
  (aStore as any).chain = _chain;

  aStore.createEntry(
    allSignState({...firstState(ledgerOutcome, ledgerChannel), turnNum: bigNumberify(1)})
  );
  aStore.chain.initialize();

  const aService = interpret(machine(aStore).withContext(context), {
    parent: {send: () => undefined} as any // Consumes uncaught errors
  }).start();

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('failure');
    expect(aService.state.context).toMatchObject({error});
  }, EXPECT_TIMEOUT);
});
