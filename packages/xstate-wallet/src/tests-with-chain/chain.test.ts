import {ChainWatcher, ChannelChainInfo, FakeChain} from '../chain';
import {bigNumberify, parseUnits, BigNumber, hexZeroPad} from 'ethers/utils';
import {Contract, providers} from 'ethers';
import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {
  ETH_ASSET_HOLDER_ADDRESS,
  CHAIN_NETWORK_ID,
  CHALLENGE_DURATION,
  TRIVIAL_APP_ADDRESS
} from '../config';
import {Machine, interpret, Interpreter} from 'xstate';
import {map} from 'rxjs/operators';
import {Store, SignedState, State} from '../store';
import {simpleEthAllocation} from '../utils';
import {Player} from '../integration-tests/helpers';
import {createSignatureEntry} from '../store/state-utils';

const chain = new ChainWatcher();

const store = new Store(chain);

const mockContext = {
  channelId: randomChannelId(),
  fundedAt: bigNumberify('0'),
  depositAt: bigNumberify('0')
};
type Init = {
  channelId: string;
  depositAt: BigNumber;
  totalAfterDeposit: BigNumber;
  fundedAt: BigNumber;
};

const provider = new providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);

let ETHAssetHolder: Contract;
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
  (window as any).ethereum = {enable: () => ['0xfec44e15328B7d1d8885a8226b0858964358F1D6']};
  chain.ethereumEnable();

  const signer = await provider.getSigner('0x28bF45680cA598708E5cDACc1414FCAc04a3F1ed');
  ETHAssetHolder = new Contract(
    ETH_ASSET_HOLDER_ADDRESS,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    signer
  );
  service = interpret(mockMachine).start(); // observable should be subscribed to on entering initial state
});

afterEach(() => {
  service.stop();
});

it('subscribes to chainUpdateFeed via a subscribeDepositEvent Observable, and sends correct event to xstate machine after a deposit', async () => {
  // const ethDepositedFilter = ETHAssetHolder.filters.Deposited();

  const depositEvent = new Promise((resolve, reject) => {
    ETHAssetHolder.on('Deposited', (from, to, amount, event) => {
      event.removeListener();
      resolve();
    });

    setTimeout(() => {
      reject(new Error('timeout'));
    }, 60000);
  });

  const tx = ETHAssetHolder.deposit(
    mockContext.channelId, // destination
    parseUnits('0', 'wei'), // expectedHeld
    parseUnits('1', 'wei'), // amount
    {
      value: parseUnits('1', 'wei') // msgValue
    }
  );

  await (await tx).wait(); // wait for tx to be mined
  await depositEvent; // wait for this test to detect the event being fired
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
      amount: bigNumberify(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: bigNumberify(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  const state: State = {
    outcome,
    turnNum: bigNumberify(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: bigNumberify(0),
    appDefinition: TRIVIAL_APP_ADDRESS, // TODO point at a deployed contract
    participants: [playerA.participant, playerB.participant]
  };

  const allSignState: SignedState = {
    ...state,
    signatures: [playerA, playerB].map(({privateKey}) => createSignatureEntry(state, privateKey))
  };
  const support = [allSignState];
  const result = await chain.challenge(support, playerA.privateKey);
  expect(result?.length).toBeGreaterThan(0);
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
      amount: bigNumberify(hexZeroPad('0x06f05b59d3b20000', 32))
    },
    {
      destination: playerA.destination,
      amount: bigNumberify(hexZeroPad('0x06f05b59d3b20000', 32))
    }
  ]);

  const state5: State = {
    outcome,
    turnNum: bigNumberify(4),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: bigNumberify(0),
    appDefinition: TRIVIAL_APP_ADDRESS, // TODO point at a deployed contract
    participants: [playerA.participant, playerB.participant]
  };
  const state5signature = createSignatureEntry(state5, playerA.privateKey);

  const state6: State = {
    outcome,
    turnNum: bigNumberify(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: CHAIN_NETWORK_ID,
    channelNonce: bigNumberify(0),
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
