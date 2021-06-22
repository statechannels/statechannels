import path from 'path';

import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {BN, makeAddress, makeDestination} from '@statechannels/wallet-core';
import {BigNumber, constants, Contract, ethers, providers} from 'ethers';
import _ from 'lodash';

import {
  defaultTestWalletConfig,
  overwriteConfigWithDatabaseConnection,
  WalletConfig,
} from '../config';
import {DBAdmin} from '../db-admin/db-admin';
import {Wallet} from '../wallet';
import {ONE_DAY} from '../__test__/test-helpers';
import {waitForObjectiveProposals} from '../__test-with-peers__/utils';
import {ARTIFACTS_DIR} from '../../jest/chain-setup';
import {SocketIOMessageService} from '../message-service/socket-io-message-service';

jest.setTimeout(60_000);

// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
if (!process.env.RPC_ENDPOINT) throw new Error('RPC_ENDPOINT must be defined');
// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
const rpcEndpoint = process.env.RPC_ENDPOINT;

const config = {
  ...defaultTestWalletConfig(),
  networkConfiguration: {
    ...defaultTestWalletConfig().networkConfiguration,
    // eslint-disable-next-line no-process-env
    chainNetworkID: parseInt(process.env.CHAIN_NETWORK_ID || '0'),
  },
};

let provider: providers.JsonRpcProvider;
let a: Wallet;
let b: Wallet;

const bWalletConfig: WalletConfig = {
  ...overwriteConfigWithDatabaseConnection(config, {database: 'server_wallet_test_b'}),
  loggingConfiguration: {
    logDestination: path.join(ARTIFACTS_DIR, 'direct-funding.log'),
    logLevel: 'trace',
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    /* eslint-disable-next-line no-process-env */
    pk: process.env.CHAIN_SERVICE_PK ?? TEST_ACCOUNTS[1].privateKey,
    allowanceMode: 'MaxUint',
  },
  syncConfiguration: {pollInterval: 1_000, timeOutThreshold: 60_000, staleThreshold: 10_000},
};
const aWalletConfig: WalletConfig = {
  ...overwriteConfigWithDatabaseConnection(config, {database: 'server_wallet_test_a'}),
  loggingConfiguration: {
    logDestination: path.join(ARTIFACTS_DIR, 'direct-funding.log'),
    logLevel: 'trace',
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    /* eslint-disable-next-line no-process-env */
    pk: process.env.CHAIN_SERVICE_PK2 ?? TEST_ACCOUNTS[2].privateKey,
    allowanceMode: 'MaxUint',
  },
  syncConfiguration: {pollInterval: 1_000, timeOutThreshold: 60_000, staleThreshold: 10_000},
};

const aAddress = '0x50Bcf60D1d63B7DD3DAF6331a688749dCBD65d96';
const bAddress = '0x632d0b05c78A83cEd439D3bd6C710c4814D3a6db';

const aFunding = BN.from(3);
const bFunding = BN.from(2);

async function getBalance(address: string): Promise<BigNumber> {
  return await provider.getBalance(address);
}

async function mineBlocks(confirmations = 5) {
  for (const _i in _.range(confirmations)) {
    await provider.send('evm_mine', []);
  }
}

const mineBlocksForEvent = () => mineBlocks();

function mineOnEvent(contract: Contract) {
  contract.on('Deposited', mineBlocksForEvent);
  contract.on('AllocationUpdated', mineBlocksForEvent);
}

beforeAll(async () => {
  provider = new providers.JsonRpcProvider(rpcEndpoint);

  await Promise.all(
    [aWalletConfig, bWalletConfig].map(async config => {
      await DBAdmin.dropDatabase(config);
      await DBAdmin.createDatabase(config);
      await DBAdmin.migrateDatabase(config);
    })
  );
  const A_PORT = 3050;
  const B_PORT = 3051;

  a = await Wallet.create(
    aWalletConfig,
    await SocketIOMessageService.createFactory('localhost', A_PORT)
  );
  b = await Wallet.create(
    bWalletConfig,
    await SocketIOMessageService.createFactory('localhost', B_PORT)
  );
  // TODO: There should be a cleaner way of doing this
  await (a.messageService as SocketIOMessageService).registerPeer('localhost', B_PORT);
  await (a.messageService as SocketIOMessageService).registerPeer('localhost', A_PORT);

  const assetHolder = new Contract(
    ethAssetHolderAddress,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    provider
  );
  mineOnEvent(assetHolder);
});

afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aWalletConfig), DBAdmin.dropDatabase(bWalletConfig)]);
  provider.polling = false;
  provider.removeAllListeners();
});

const testCases: Array<'A' | 'B'> = [];
test.each(testCases)(
  `can successfully fund and defund a channel between two wallets with %s closing`,
  async closer => {
    const participantA: Participant = {
      signingAddress: await a.getSigningAddress(),
      participantId: 'a',
      destination: makeDestination(aAddress),
    };
    const participantB: Participant = {
      signingAddress: await b.getSigningAddress(),
      participantId: 'b',
      destination: makeDestination(bAddress),
    };

    const allocation: Allocation = {
      allocationItems: [
        {
          destination: participantA.destination,
          amount: aFunding,
        },
        {
          destination: participantB.destination,
          amount: bFunding,
        },
      ],
      assetHolderAddress: ethAssetHolderAddress,
    };

    const channelParams: CreateChannelParams = {
      participants: [participantA, participantB],
      allocations: [allocation],
      appDefinition: ethers.constants.AddressZero,
      appData: constants.HashZero,
      fundingStrategy: 'Direct',
      challengeDuration: ONE_DAY,
    };
    const aBalanceInit = await getBalance(aAddress);
    const bBalanceInit = await getBalance(bAddress);
    const assetHolderBalanceInit = await getBalance(ethAssetHolderAddress);

    const response = await a.createChannels([channelParams]);
    await waitForObjectiveProposals([response[0].objectiveId], b);
    const bResponse = await b.approveObjectives([response[0].objectiveId]);

    await expect(response).toBeObjectiveDoneType('Success');
    await expect(bResponse).toBeObjectiveDoneType('Success');

    const assetHolderBalanceUpdated = await getBalance(ethAssetHolderAddress);
    expect(BN.sub(assetHolderBalanceUpdated, assetHolderBalanceInit)).toEqual(
      BN.add(aFunding, bFunding)
    );

    const {channelId} = response[0];
    const closeResponse =
      closer === 'A' ? await a.closeChannels([channelId]) : await b.closeChannels([channelId]);
    await expect(closeResponse).toBeObjectiveDoneType('Success');

    const aBalanceFinal = await getBalance(aAddress);
    const bBalanceFinal = await getBalance(bAddress);

    expect(BN.sub(aBalanceFinal, aBalanceInit)).toEqual(aFunding);
    expect(BN.sub(bBalanceFinal, bBalanceInit)).toEqual(bFunding);
  }
);
