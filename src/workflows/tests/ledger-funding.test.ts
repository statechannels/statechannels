import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';
import {add} from '../../utils/math-utils';

import {Init, machine, Errors} from '../ledger-funding';

import {MemoryStore, Store} from '../../store/memory-store';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {checkThat} from '../../utils';
import {isSimpleEthAllocation} from '../../utils/outcome';
import {FakeChain, Chain} from '../../chain';
import {wallet1, wallet2, participants} from './data';
import {subscribeToMessages} from './message-service';
import {ETH_ASSET_HOLDER_ADDRESS} from '../../constants';

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
let aStore: Store;
let bStore: Store;

const allSignState = (state: State) => ({
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => signState(state, privateKey))
});

beforeEach(() => {
  aStore = new MemoryStore([wallet1.privateKey], chain);
  bStore = new MemoryStore([wallet2.privateKey], chain);

  const message = {
    signedStates: [
      allSignState(firstState(outcome, targetChannel)),
      allSignState(firstState(outcome, ledgerChannel))
    ]
  };
  [aStore, bStore].forEach((store: Store) => store.pushMessage(message));

  subscribeToMessages({
    [participants[0].participantId]: aStore,
    [participants[1].participantId]: bStore
  });
});

test('multiple workflows', async () => {
  const _chain = new FakeChain();
  _chain.depositSync(ledgerChannelId, '0', amounts.reduce(add).toHexString());
  [aStore, bStore].forEach((store: Store) => (store.chain = _chain));

  const aService = interpret(machine(aStore).withContext(context));

  const bService = interpret(machine(bStore).withContext(context));
  [aService, bService].map(s => s.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported} = await aStore.getEntry(ledgerChannelId);
    const outcome = checkThat(supported?.outcome, isSimpleEthAllocation);

    expect(outcome.allocationItems).toMatchObject(
      [0, 1]
        .map(i => ({
          destination: destinations[i],
          amount: amounts[i].sub(deductionAmounts[i])
        }))
        .concat([{destination: targetChannelId, amount: deductionAmounts.reduce(add)}])
    );

    expect((await aStore.getEntry(targetChannelId)).funding).toMatchObject({
      type: 'Indirect',
      ledgerId: ledgerChannelId
    });
  }, EXPECT_TIMEOUT);
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
  aStore.chain = _chain;

  aStore.pushMessage({
    signedStates: [
      allSignState({...firstState(ledgerOutcome, ledgerChannel), turnNum: bigNumberify(1)})
    ]
  });
  aStore.chain.initialize();

  const aService = interpret(machine(aStore).withContext(context), {
    parent: {send: () => undefined} as any // Consumes uncaught errors
  }).start();

  await waitForExpect(async () => {
    expect(aService.state.value).toEqual('failure');
    expect(aService.state.context).toMatchObject({error});
  }, EXPECT_TIMEOUT);
});
