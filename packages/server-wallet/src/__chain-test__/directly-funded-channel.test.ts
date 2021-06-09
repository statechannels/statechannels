import path from 'path';

import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {BN, makeAddress, makeDestination} from '@statechannels/wallet-core';
import {BigNumber, constants, Contract, ethers, providers} from 'ethers';
import _ from 'lodash';

import {ChainService} from '../chain-service';
import {defaultTestConfig, overwriteConfigWithDatabaseConnection, EngineConfig} from '../config';
import {DBAdmin} from '../db-admin/db-admin';
import {Engine} from '../engine';
import {TestMessageService} from '../message-service/test-message-service';
import {SyncOptions, Wallet} from '../wallet';
import {ONE_DAY} from '../__test__/test-helpers';
import {waitForObjectiveProposals} from '../__test-with-peers__/utils';
import {ARTIFACTS_DIR} from '../../jest/chain-setup';

jest.setTimeout(60_000);

// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
const ethAssetHolderAddress = makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS!);
// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
if (!process.env.RPC_ENDPOINT) throw new Error('RPC_ENDPOINT must be defined');
// eslint-disable-next-line no-process-env, @typescript-eslint/no-non-null-assertion
const rpcEndpoint = process.env.RPC_ENDPOINT;

const config = {
  ...defaultTestConfig(),
  networkConfiguration: {
    ...defaultTestConfig().networkConfiguration,
    // eslint-disable-next-line no-process-env
    chainNetworkID: parseInt(process.env.CHAIN_NETWORK_ID || '0'),
  },
};

let provider: providers.JsonRpcProvider;
let a: Wallet;
let b: Wallet;
let aEngine: Engine;
let bEngine: Engine;

const bEngineConfig: EngineConfig = {
  ...overwriteConfigWithDatabaseConnection(config, {database: 'server_wallet_test_b'}),
  loggingConfiguration: {
    logDestination: path.join(ARTIFACTS_DIR, 'direct-funding.log'),
    logLevel: 'trace',
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    /* eslint-disable-next-line no-process-env */
    pk: process.env.CHAIN_SERVICE_PK ?? ETHERLIME_ACCOUNTS[1].privateKey,
    allowanceMode: 'MaxUint',
  },
};
const aEngineConfig: EngineConfig = {
  ...overwriteConfigWithDatabaseConnection(config, {database: 'server_wallet_test_a'}),
  loggingConfiguration: {
    logDestination: path.join(ARTIFACTS_DIR, 'direct-funding.log'),
    logLevel: 'trace',
  },
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    /* eslint-disable-next-line no-process-env */
    pk: process.env.CHAIN_SERVICE_PK2 ?? ETHERLIME_ACCOUNTS[2].privateKey,
    allowanceMode: 'MaxUint',
  },
};

const aAddress = '0x50Bcf60D1d63B7DD3DAF6331a688749dCBD65d96';
const bAddress = '0x632d0b05c78A83cEd439D3bd6C710c4814D3a6db';

const aFunding = BN.from(1);
const bFunding = BN.from(0);

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
}

beforeAll(async () => {
  provider = new providers.JsonRpcProvider(rpcEndpoint);

  await Promise.all(
    [aEngineConfig, bEngineConfig].map(async config => {
      await DBAdmin.dropDatabase(config);
      await DBAdmin.createDatabase(config);
      await DBAdmin.migrateDatabase(config);
    })
  );

  aEngine = await Engine.create(aEngineConfig);
  bEngine = await Engine.create(bEngineConfig);
  const aChainService = new ChainService({
    ...aEngineConfig.chainServiceConfiguration,
    logger: aEngine.logger,
  });
  const bChainService = new ChainService({
    ...bEngineConfig.chainServiceConfiguration,
    logger: bEngine.logger,
  });

  const syncOptions: SyncOptions = {
    pollInterval: 1_000,
    timeOutThreshold: 60_000,
    staleThreshold: 10_000,
  };
  a = await Wallet.create(aEngine, aChainService, TestMessageService.create, syncOptions);
  b = await Wallet.create(bEngine, bChainService, TestMessageService.create, syncOptions);

  TestMessageService.linkMessageServices(a.messageService, b.messageService, aEngine.logger);
  const assetHolder = new Contract(
    ethAssetHolderAddress,
    ContractArtifacts.EthAssetHolderArtifact.abi,
    provider
  );
  mineOnEvent(assetHolder);
});

afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await Promise.all([DBAdmin.dropDatabase(aEngineConfig), DBAdmin.dropDatabase(bEngineConfig)]);
  provider.polling = false;
  provider.removeAllListeners();
});

it('Create a directly funded channel between two wallets ', async () => {
  const participantA: Participant = {
    signingAddress: await aEngine.getSigningAddress(),
    participantId: 'a',
    destination: makeDestination(aAddress),
  };
  const participantB: Participant = {
    signingAddress: await bEngine.getSigningAddress(),
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
  expect(BN.sub(assetHolderBalanceUpdated, assetHolderBalanceInit)).toEqual('0x01');

  const {channelId} = response[0];
  const closeResponse = await b.closeChannels([channelId]);
  await expect(closeResponse).toBeObjectiveDoneType('Success');

  const aBalanceFinal = await getBalance(aAddress);
  const bBalanceFinal = await getBalance(bAddress);

  expect(BN.sub(aBalanceFinal, aBalanceInit)).toEqual(aFunding);
  expect(BN.sub(bBalanceFinal, bBalanceInit)).toEqual(bFunding);

  // TODO: This is slightly hacky but it's a workaround for chain event listeners promises
  // that are still executing when destroy is called.
  await new Promise(resolve => setTimeout(resolve, 2_000));
});
