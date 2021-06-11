import {
  DBAdmin,
  defaultTestConfig,
  Output,
  SingleChannelOutput,
  SingleThreadedEngine
} from '@statechannels/server-wallet';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import {ChannelWallet} from '@statechannels/browser-wallet';
import {constants, Contract, providers, Wallet} from 'ethers';
import {
  Address,
  BN,
  deserializeMessage,
  Destination,
  formatAmount,
  makeAddress,
  makeDestination,
  Uint256
} from '@statechannels/wallet-core';
import {fromEvent} from 'rxjs';
import {first} from 'rxjs/operators';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import _ from 'lodash';
import {
  CreateChannelParams,
  isJsonRpcNotification,
  Message,
  PushMessageRequest
} from '@statechannels/client-api-schema';
import {Message as WireMessage} from '@statechannels/wire-format';

jest.setTimeout(60_000);

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const rpcEndpoint = process.env.RPC_ENDPOINT;
const chainId = process.env.CHAIN_ID;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!rpcEndpoint) throw new Error('RPC_ENDPOINT must be defined');

const serverConfig = defaultTestConfig({
  databaseConfiguration: {
    connection: {
      database: 'interop_test'
    }
  },
  networkConfiguration: {
    chainNetworkID: chainId
      ? parseInt(chainId)
      : defaultTestConfig().networkConfiguration.chainNetworkID
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    pk: TEST_ACCOUNTS[0].privateKey
  }
});

let provider: providers.JsonRpcProvider;
let assetHolderContract: Contract;
let serverWallet: SingleThreadedEngine;
let browserWallet: ChannelWallet;
let serverAddress: Address;
let serverDestination: Destination;
let browserAddress: Address;
let browserDestination: Destination;
let objectiveSuccededPromise: Promise<void>;

beforeAll(async () => {
  provider = new providers.JsonRpcProvider(rpcEndpoint);
  assetHolderContract = new Contract(
    ethAssetHolderAddress,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    provider
  );
  mineOnEvent(assetHolderContract);
  // TODO: The onSendMessage listener can still be executing
  // so we can't properly restart the engine
  await DBAdmin.truncateDatabase(serverConfig);
  serverWallet = await SingleThreadedEngine.create(serverConfig);
});

beforeEach(async () => {
  browserWallet = await ChannelWallet.create(
    makeAddress(new Wallet(TEST_ACCOUNTS[1].privateKey).address)
  );

  serverAddress = await serverWallet.getSigningAddress();
  serverDestination = makeDestination(serverAddress);

  browserAddress = makeAddress(await browserWallet.getAddress());
  browserDestination = makeDestination(browserAddress);

  browserWallet.onSendMessage(message => {
    if (isJsonRpcNotification(message)) {
      // TODO: Since we're not awaiting this it can execute while knex is being destroyed
      serverWallet.pushMessage((message.params as Message).data);
    }
  });

  // objectiveSuccededPromise = new Promise<void>(r => {
  //   serverWallet.on('objectiveSucceeded', (o: WalletObjective) => {
  //     if (o.type === 'OpenChannel' && o.status === 'succeeded') r();
  //   });
  // });
});

afterEach(async () => {
  browserWallet.destroy();
});

afterAll(async () => {
  await serverWallet.destroy();
  provider.polling = false;
  provider.removeAllListeners();
  assetHolderContract.removeAllListeners();
});

async function mineBlocks(confirmations = 5) {
  for (const _i in _.range(confirmations)) {
    await provider.send('evm_mine', []);
  }
}
const mineBlocksForEvent = () => mineBlocks();
function mineOnEvent(contract: Contract) {
  contract.on('Deposited', mineBlocksForEvent);
}

function serverMessageToBrowserMessage(serverOutput: Output): PushMessageRequest {
  return generatePushMessage(serverOutput.outbox[0].params);
}

function generatePushMessage(messageParams: Message): PushMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 111111111,
    method: 'PushMessage',
    params: messageParams
  };
}

// In theory, we should be able to check the channelResult. In practice, the channelResult seems to have an incorrect turn number
function containsPostfundState(singleChannelOutput: SingleChannelOutput): boolean {
  if (!singleChannelOutput.outbox.length) return false;

  const signedStates = deserializeMessage(singleChannelOutput.outbox[0].params as WireMessage)
    .signedStates;
  return signedStates ? signedStates?.some(ss => ss.turnNum === 3) : false;
}
// TODO: To get this working it must be updated to use a server wallet instead of an engine.
it.skip('server wallet creates channel + cooperates with browser wallet to fund channel', async () => {
  const output1 = await serverWallet.createChannel({
    appData: '0x',
    appDefinition: constants.AddressZero,
    fundingStrategy: 'Direct',
    challengeDuration: 86400, // one day
    participants: [
      {
        participantId: 'server',
        signingAddress: serverAddress,
        destination: serverDestination
      },
      {
        participantId: browserAddress,
        signingAddress: browserAddress,
        destination: browserDestination
      }
    ],
    allocations: [
      {
        assetHolderAddress: ethAssetHolderAddress,
        allocationItems: [
          {
            amount: BN.from(3),
            destination: serverDestination
          },
          {amount: BN.from(5), destination: browserDestination}
        ]
      }
    ]
  });

  await browserWallet.pushMessage(serverMessageToBrowserMessage(output1), 'dummyDomain');

  // TODO: the proper way to do this is to wait for a ChannelProposed or some sort of new objective notification
  await browserWallet.pushMessage(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'JoinChannel',
      params: {channelId: output1.channelResult.channelId}
    },
    'dummyDomain'
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postFundA = await fromEvent<SingleChannelOutput>(serverWallet as any, 'channelUpdated')
    .pipe(first(containsPostfundState))
    .toPromise();

  // serverWallet.on('channelUpdated', e => console.log(JSON.stringify(e)));
  await browserWallet.pushMessage(serverMessageToBrowserMessage(await postFundA), 'dummyDomain');

  await objectiveSuccededPromise;
});

it.skip('browser wallet creates channel + cooperates with server wallet to fund channel', async () => {
  const createChannelParams: CreateChannelParams = {
    participants: [
      {
        participantId: browserAddress,
        signingAddress: browserAddress,
        destination: browserDestination
      },
      {
        participantId: 'server',
        signingAddress: serverAddress,
        destination: serverDestination
      }
    ],
    allocations: [
      {
        assetHolderAddress: ethAssetHolderAddress,
        allocationItems: [
          {
            amount: formatAmount('0x5' as Uint256),
            destination: browserDestination
          },
          {
            amount: formatAmount('0x3' as Uint256),
            destination: serverDestination
          }
        ]
      }
    ],
    appDefinition: constants.AddressZero,
    appData: '0x',
    fundingStrategy: 'Direct',
    challengeDuration: 86400 // one day
  };

  await browserWallet.pushMessage(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'CreateChannel',
      params: createChannelParams
    },
    'dummyDomain'
  );
  const channelId = Object.keys(browserWallet.getRichObjectives())[0];
  await browserWallet.approveRichObjective(channelId);

  const serverOutput1 = await serverWallet.joinChannel({channelId});
  await browserWallet.pushMessage(serverMessageToBrowserMessage(serverOutput1), 'dummyDomain');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postFundA = await fromEvent<SingleChannelOutput>(serverWallet as any, 'channelUpdated')
    .pipe(first(containsPostfundState))
    .toPromise();

  await browserWallet.pushMessage(serverMessageToBrowserMessage(postFundA), 'dummyDomain');

  await objectiveSuccededPromise;
});
