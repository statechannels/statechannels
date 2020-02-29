import {ChainWatcher, ChannelChainInfo} from '../chain';
import {parseUnits} from 'ethers/utils';
import {Contract, providers} from 'ethers';
import {ContractArtifacts, randomChannelId} from '@statechannels/nitro-protocol';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {Machine, interpret, Interpreter} from 'xstate';
import {map} from 'rxjs/operators';
import {MemoryStore} from '../store/memory-store';
import {gte, toHex} from '../utils/hex-number-utils';
import {HexNumberString} from '../store/types';

const chain = new ChainWatcher();

const store = new MemoryStore(undefined, chain);

const mockContext = {
  channelId: randomChannelId(),
  fundedAt: toHex('0'),
  depositAt: toHex('0')
};
type Init = {
  channelId: string;
  depositAt: HexNumberString;
  totalAfterDeposit: HexNumberString;
  fundedAt: HexNumberString;
};

const provider = new providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);

let ETHAssetHolder: Contract;
let service: Interpreter<any, any, any, any>;

// this service to be invoked by a protocol xstate machine
const subscribeDepositEvent = (ctx: Init) => {
  return store.chain.chainUpdatedFeed(ctx.channelId).pipe(
    map((chainInfo: ChannelChainInfo) => {
      if (gte(chainInfo.amount, ctx.fundedAt)) {
        return 'FUNDED';
      } else if (gte(chainInfo.amount, ctx.depositAt)) {
        return 'SAFE_TO_DEPOSIT';
      } else {
        return 'NOT_SAFE_TO_DEPOSIT';
      }
    })
  );
};

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

beforeEach(async () => {
  const signer = await provider.getSigner();
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
