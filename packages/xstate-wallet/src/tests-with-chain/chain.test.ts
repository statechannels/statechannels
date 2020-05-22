import {ChainWatcher, ChannelChainInfo} from '../chain';
import {Contract, BigNumber} from 'ethers';
import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {ETH_ASSET_HOLDER_ADDRESS} from '../config';
import {Machine, interpret, Interpreter} from 'xstate';
import {map} from 'rxjs/operators';
import {Store} from '../store';
import {parseUnits} from '@ethersproject/units';
import {JsonRpcProvider} from '@ethersproject/providers';

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

const provider = new JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);

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
