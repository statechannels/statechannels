import {
  DBAdmin,
  defaultTestWalletConfig,
  SyncOptions,
  Wallet as ServerWallet
} from '@statechannels/server-wallet';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import {ChannelWallet} from '@statechannels/browser-wallet';
import {constants, Contract, providers, Wallet} from 'ethers';
import {
  Address,
  BN,
  Destination,
  formatAmount,
  makeAddress,
  makeDestination,
  Uint256
} from '@statechannels/wallet-core';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import _ from 'lodash';
import {CreateChannelParams} from '@statechannels/client-api-schema';

import {BrowserServerMessageService} from '../message-service';

jest.setTimeout(60_000);

/* eslint-disable no-process-env, @typescript-eslint/no-non-null-assertion */
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
const rpcEndpoint = process.env.RPC_ENDPOINT;
const chainId = process.env.CHAIN_ID;
/* eslint-enable no-process-env, @typescript-eslint/no-non-null-assertion */

if (!rpcEndpoint) throw new Error('RPC_ENDPOINT must be defined');

const serverConfig = defaultTestWalletConfig({
  databaseConfiguration: {
    connection: {
      database: 'interop_test'
    }
  },
  networkConfiguration: {
    chainNetworkID: chainId
      ? parseInt(chainId)
      : defaultTestWalletConfig().networkConfiguration.chainNetworkID
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    pk: TEST_ACCOUNTS[0].privateKey
  }
});

let provider: providers.JsonRpcProvider;
let assetHolderContract: Contract;
let serverWallet: ServerWallet;
let browserWallet: ChannelWallet;
let serverAddress: Address;
let serverDestination: Destination;
let browserAddress: Address;
let browserDestination: Destination;

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

  browserWallet = await ChannelWallet.create(
    makeAddress(new Wallet(TEST_ACCOUNTS[1].privateKey).address)
  );

  const factory = BrowserServerMessageService.createFactory(browserWallet);
  // Currently the browser wallet crashes if it receives the same objective again
  // To avoid this we prevent the wallet from retrying objectives by using
  // a really large poll value (one hour)
  const syncOptions: Partial<SyncOptions> = {pollInterval: 3_600_000};
  serverWallet = await ServerWallet.create(serverConfig, factory, syncOptions);

  serverAddress = await serverWallet.getSigningAddress();
  serverDestination = makeDestination(serverAddress);

  browserAddress = makeAddress(await browserWallet.getAddress());
  browserDestination = makeDestination(browserAddress);
});

afterAll(async () => {
  browserWallet.destroy();
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

it('server wallet creates channel + cooperates with browser wallet to fund channel', async () => {
  const [createResult] = await serverWallet.createChannels([
    {
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
    }
  ]);

  const {channelId} = createResult;
  // TODO: the proper way to do this is to wait for a ChannelProposed or some sort of new objective notification
  await browserWallet.pushMessage(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'JoinChannel',
      params: {channelId}
    },
    'dummyDomain'
  );

  const result = await createResult.done;
  expect(result.type).toBe('Success');
});

it('browser wallet creates channel + cooperates with server wallet to fund channel', async () => {
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
  const objectiveId = `OpenChannel-${channelId}`;
  const [approveResult] = await serverWallet.approveObjectives([objectiveId]);

  const result = await approveResult.done;
  expect(result.type).toBe('Success');
});
