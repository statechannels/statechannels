import {ChainWatcher} from '../chain';
import {bigNumberify, parseUnits} from 'ethers/utils';
import {map} from 'rxjs/operators';
import {Contract, providers} from 'ethers';
import {ContractArtifacts, getDepositedEvent, randomChannelId} from '@statechannels/nitro-protocol';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';
import {Machine, interpret, Interpreter} from 'xstate';

const chain = new ChainWatcher();

const store = {
  chain,
  getHoldings: (channelId: string) => '10'
};

const mockContext = {
  channelId: randomChannelId(),
  fundedAt: bigNumberify('0')
};

const provider = new providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);

let ETHAssetHolder: Contract;
let service: Interpreter<any, any, any, any>;

// this service to be invoked by a protocol xstate machine
const subscribeToFundingFeed = (context: any, event: any) => {
  return store.chain.fundingFeed(context.channelId).pipe(
    map(async event => {
      console.log(event);
      if (event.type === 'DEPOSITED') {
        const currentHoldings = bigNumberify(await store.getHoldings(context.channelId));
        if (currentHoldings.gte(context.fundedAt)) {
          return 'FUNDED';
        } else if (currentHoldings.gte(context.depositAt)) {
          return 'SAFE_TO_DEPOSIT';
        } else {
          return 'NOT_SAFE_TO_DEPOSIT';
        }
      } else return;
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
        src: subscribeToFundingFeed
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
  ETHAssetHolder = new Contract(
    ETH_ASSET_HOLDER_ADDRESS,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    await provider.getSigner()
  );
  await store.chain.initialize();
  service = interpret(mockMachine).onTransition(state => {
    console.log(state.value); // observable should be subscribed to on entering initial state
  });
  service.start();
});

afterAll(() => {
  service.stop();
});

it('subscribes to funding Feed', async () => {
  const tx = ETHAssetHolder.deposit(
    mockContext.channelId, // destination
    parseUnits('0', 'wei'), // expectedHeld
    parseUnits('1', 'wei'), // amount
    {
      value: parseUnits('1', 'wei') // msgValue
    }
  );

  const {events} = await (await tx).wait();
  const event = getDepositedEvent(events);
  console.log(event);
  // expect(fundedEventSent).toHaveBeenCalled();
});
