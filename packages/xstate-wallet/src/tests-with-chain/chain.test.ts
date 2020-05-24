import {ChainWatcher, FakeChain, ChannelChainInfo} from '../chain';
import {BigNumber} from 'ethers';
import {randomChannelId} from '@statechannels/nitro-protocol';
import {CHAIN_NETWORK_ID, CHALLENGE_DURATION, TRIVIAL_APP_ADDRESS} from '../config';

import {first, take, map} from 'rxjs/operators';
import {SignedState, State, Store} from '../store';

import {simpleEthAllocation} from '../utils';
import {Player} from '../integration-tests/helpers';
import {createSignatureEntry, calculateChannelId, statesEqual} from '../store/state-utils';
import {hexZeroPad} from '@ethersproject/bytes';
import {Zero, One} from '@ethersproject/constants';

import {Interpreter, Machine, interpret} from 'xstate';

const chain = new ChainWatcher();

const store = new Store(chain);

const mockContext = {
  channelId: randomChannelId(),
  fundedAt: BigNumber.from('0'),
  depositAt: BigNumber.from('0')
};
type Init = {
  channelId: string;
  depositAt: BigNumber;
  totalAfterDeposit: BigNumber;
  fundedAt: BigNumber;
};

let service: Interpreter<any, any, any, any>;

// this service to be invoked by a protocol xstate machine
const subscribeDepositEvent = (ctx: Init) =>
  store.chain.chainUpdatedFeed(ctx.channelId).pipe(
    map((chainInfo: ChannelChainInfo) => {
      if (chainInfo.amount.gte(ctx.fundedAt)) {
        return 'FUNDED';
      } else if (chainInfo.amount.gte(ctx.depositAt)) {
        return 'SAFE_TO_DEPOSIT';
      } else {
        return 'NOT_SAFE_TO_DEPOSIT';
      }
    })
  );

const fundedEventSent = jest.fn();
const safeToDepositEventSent = jest.fn();
const notSafeToDepositEventSent = jest.fn();

const mockMachine = Machine({
  initial: 'init',
  context: mockContext,
  states: {
    init: {
      invoke: {
        src: subscribeDepositEvent
      },
      on: {
        FUNDED: {actions: fundedEventSent},
        SAFE_TO_DEPOSIT: {actions: safeToDepositEventSent},
        NOT_SAFE_TO_DEPOSIT: {actions: notSafeToDepositEventSent}
      }
    }
  }
});

beforeAll(async () => {
  (window as any).ethereum = {
    enable: () => ['0xfec44e15328B7d1d8885a8226b0858964358F1D6'],
    fake: true
  };
  await chain.ethereumEnable();
  await chain.initialize();
  service = interpret(mockMachine).start(); // observable should be subscribed to on entering initial state
});

afterEach(() => {
  service.stop();
});

it('subscribes to chainUpdateFeed via a subscribeDepositEvent Observable, and sends correct event to xstate machine after a deposit', async () => {
  // const ethDepositedFilter = ETHAssetHolder.filters.Deposited();

  await chain.deposit(mockContext.channelId, Zero.toHexString(), One.toHexString());

  expect(fundedEventSent).toHaveBeenCalled();
});

it('correctly crafts a forceMove transaction (1x double-signed state)', async () => {
  const fakeChain = new FakeChain();
  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );
  const playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    fakeChain
  );

  const outcome = simpleEthAllocation([
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  const state: State = {
    outcome,
    turnNum: BigNumber.from(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: Zero,
    appDefinition: TRIVIAL_APP_ADDRESS, // TODO point at a deployed contract
    participants: [playerA.participant, playerB.participant]
  };

  const allSignState: SignedState = {
    ...state,
    signatures: [playerA, playerB].map(({privateKey}) => createSignatureEntry(state, privateKey))
  };
  4;
  const support = [allSignState];
  const result = await chain.challenge(support, playerA.privateKey);
  expect(result?.length).toBeGreaterThan(0);
});

it('the challenge state gets returned when there is an existing challenge', async () => {
  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    chain
  );
  const playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    chain
  );

  const outcome = simpleEthAllocation([
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  const state: State = {
    outcome,
    turnNum: BigNumber.from(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: BigNumber.from(4),
    appDefinition: TRIVIAL_APP_ADDRESS, // TODO point at a deployed contract
    participants: [playerA.participant, playerB.participant]
  };

  // const channelId = calculateChannelId(state);
  const allSignState: SignedState = {
    ...state,
    signatures: [playerA, playerB].map(({privateKey}) => createSignatureEntry(state, privateKey))
  };
  const support = [allSignState];

  await chain.challenge(support, playerA.privateKey);
  const channelId = calculateChannelId(state);
  const chainEntry = await chain
    .chainUpdatedFeed(channelId)
    .pipe(first())
    .toPromise();
  expect(chainEntry.challengeState).toBeDefined();
  expect(statesEqual(state, chainEntry.challengeState as State)).toBe(true);
});

it('the chainUpdated fires and returns a challenge state when a challenge occurs', async () => {
  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    chain
  );
  const playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    chain
  );

  const outcome = simpleEthAllocation([
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  const state: State = {
    outcome,
    turnNum: BigNumber.from(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: BigNumber.from(3),
    appDefinition: TRIVIAL_APP_ADDRESS, // TODO point at a deployed contract
    participants: [playerA.participant, playerB.participant]
  };

  // const channelId = calculateChannelId(state);
  const allSignState: SignedState = {
    ...state,
    signatures: [playerA, playerB].map(({privateKey}) => createSignatureEntry(state, privateKey))
  };
  const support = [allSignState];
  const channelId = calculateChannelId(state);
  const chainEntryPromise = chain
    .chainUpdatedFeed(channelId)
    .pipe(take(1))
    .toPromise();

  await chain.challenge(support, playerA.privateKey);
  const chainEntry = await chainEntryPromise;
  expect(chainEntry.challengeState).toBeDefined();
  expect(statesEqual(state, chainEntry.challengeState as State)).toBe(true);
});
it('correctly crafts a forceMove transaction (2x single-signed states)', async () => {
  const fakeChain = new FakeChain();
  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );
  const playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    fakeChain
  );

  const outcome = simpleEthAllocation([
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: BigNumber.from(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  const state5: State = {
    outcome,
    turnNum: BigNumber.from(4),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: BigNumber.from(1),
    appDefinition: TRIVIAL_APP_ADDRESS, // TODO point at a deployed contract
    participants: [playerA.participant, playerB.participant]
  };
  const state5signature = createSignatureEntry(state5, playerA.privateKey);

  const state6: State = {
    outcome,
    turnNum: BigNumber.from(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: BigNumber.from(1),
    appDefinition: TRIVIAL_APP_ADDRESS,
    participants: [playerA.participant, playerB.participant]
  };

  const state6signature = createSignatureEntry(state6, playerB.privateKey);

  const support = [
    {...state5, signatures: [state5signature]},
    {...state6, signatures: [state6signature]}
  ];
  const result = await chain.challenge(support, playerA.privateKey);
  expect(result?.length).toBeGreaterThan(0);
});
