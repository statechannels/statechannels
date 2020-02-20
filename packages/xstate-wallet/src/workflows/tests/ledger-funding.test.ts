import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';
import {add} from '../../utils/math-utils';

import {Init, machine} from '../ledger-funding';

import {MemoryStore, Store} from '../../store/memory-store';
import {ethers} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, Participant, SignedState} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {createDestination, checkThat} from '../../utils';
import {isSimpleEthAllocation} from '../../utils/outcome';
import {FakeChain, Chain} from '../../chain';

const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf
const wallet2 = new ethers.Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9

const wallets = {
  [wallet1.address]: wallet1,
  [wallet2.address]: wallet2
};

const participants: Participant[] = [
  {
    destination: createDestination(wallet1.address),
    signingAddress: wallet1.address,
    participantId: 'a'
  },
  {
    destination: createDestination(wallet2.address),
    signingAddress: wallet2.address,
    participantId: 'b'
  }
];

jest.setTimeout(20000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;
const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const targetChannelId = createDestination('0xabcdabcd');
const ledgerChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
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
  type: 'SimpleEthAllocation',
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};
const deductions = [0, 1].map(i => ({
  destination: destinations[i],
  amount: deductionAmounts[i]
}));

const state = firstState(outcome, ledgerChannel);
const supportedLedgerState: SignedState = {
  ...state,
  signatures: [wallet1, wallet2].map(({privateKey}) => signState(state, privateKey))
};
const message = {signedStates: [supportedLedgerState]};

const context: Init = {targetChannelId, ledgerChannelId, deductions};

let chain: Chain;
let aStore: Store;
let bStore: Store;

function autosignMessages(store) {
  store.outboxFeed.subscribe(e => {
    e.signedStates?.forEach(state => {
      state.participants.map(p => {
        const signatures = state.participants.map(p =>
          signState(state, wallets[p.signingAddress].privateKey)
        );
        store.pushMessage({signedStates: [{...state, signatures}]});
      });
    });
  });
}

beforeEach(() => {
  const _chain = new FakeChain();
  _chain.depositSync(ledgerChannelId, '0', '12');
  chain = _chain;

  aStore = new MemoryStore([wallet1.privateKey], chain);
  bStore = new MemoryStore([wallet2.privateKey], chain);
  const stores = [aStore, bStore];
  stores.forEach((store: Store) => {
    store.pushMessage(message);
    autosignMessages(store);
  });
});

test('Indirect funding as A', async () => {
  const store = aStore;

  const service = interpret(machine(store, context)).start();

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('success');

    const {supported} = await store.getEntry(ledgerChannelId);
    const outcome = checkThat(supported?.outcome, isSimpleEthAllocation);

    expect(outcome.allocationItems).toMatchObject(
      [0, 1]
        .map(i => ({
          destination: destinations[i],
          amount: amounts[i].sub(deductionAmounts[i])
        }))
        .concat([{destination: targetChannelId, amount: deductionAmounts.reduce(add)}])
    );
  }, EXPECT_TIMEOUT);
});

test('multiple workflows', async () => {
  const aService = interpret(machine(aStore, context));
  const bService = interpret(machine(bStore, context));
  [aService, bService].map(s => s.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);
});
