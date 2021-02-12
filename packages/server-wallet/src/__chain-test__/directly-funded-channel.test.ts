import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {BN, makeAddress, makeDestination} from '@statechannels/wallet-core';
import {BigNumber, constants, Contract, ethers, providers} from 'ethers';
import _ from 'lodash';
import {fromEvent} from 'rxjs';
import {take} from 'rxjs/operators';

import {
  defaultTestConfig,
  overwriteConfigWithDatabaseConnection,
  ServerWalletConfig,
} from '../config';
import {DBAdmin} from '../db-admin/db-admin';
import {Wallet, SingleChannelOutput} from '../wallet';
import {getChannelResultFor, getPayloadFor, ONE_DAY} from '../__test__/test-helpers';

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

const bWalletConfig: ServerWalletConfig = {
  ...overwriteConfigWithDatabaseConnection(config, {database: 'TEST_B'}),
  chainServiceConfiguration: {
    attachChainService: true,
    provider: rpcEndpoint,
    /* eslint-disable-next-line no-process-env */
    pk: process.env.CHAIN_SERVICE_PK ?? ETHERLIME_ACCOUNTS[1].privateKey,
    allowanceMode: 'MaxUint',
  },
};
const aWalletConfig: ServerWalletConfig = {
  ...overwriteConfigWithDatabaseConnection(config, {database: 'TEST_A'}),
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
    [aWalletConfig, bWalletConfig].map(async config => {
      await DBAdmin.dropDatabase(config);
      await DBAdmin.createDatabase(config);
      await DBAdmin.migrateDatabase(config);
    })
  );

  a = await Wallet.create(aWalletConfig);
  b = await Wallet.create(bWalletConfig);

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
});

it('Create a directly funded channel between two wallets ', async () => {
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

  // the type assertion is due to
  // https://github.com/devanshj/rxjs-from-emitter/blob/master/docs/solving-some-from-event-flaws.md#the-way-fromevent-checks-if-the-first-argument-passed-is-an-emitter-or-not-is-incorrect
  const postFundAPromise = fromEvent<SingleChannelOutput>(a as any, 'channelUpdated')
    .pipe(take(2))
    .toPromise();

  const postFundBPromise = fromEvent<SingleChannelOutput>(b as any, 'channelUpdated')
    .pipe(take(2))
    .toPromise();

  const channelClosedAPromise = fromEvent<SingleChannelOutput>(a as any, 'channelUpdated')
    .pipe(take(4))
    .toPromise();

  //        A <> B
  // PreFund0
  const preFundA = await a.createChannel(channelParams);

  const channelId = preFundA.channelResults[0].channelId;

  const aBalanceInit = await getBalance(aAddress);
  const bBalanceInit = await getBalance(bAddress);

  expect(getChannelResultFor(channelId, preFundA.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const resultB0 = await b.pushMessage(getPayloadFor(participantB.participantId, preFundA.outbox));

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  const prefundB = await b.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [prefundB.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const resultA0 = await a.pushMessage(getPayloadFor(participantA.participantId, prefundB.outbox));

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const postFundA = await postFundAPromise;
  const postFundB = await postFundBPromise;

  expect(postFundA.channelResult).toMatchObject({
    channelId,
    status: 'opening',
    turnNum: 0,
  });

  expect(postFundB.channelResult).toMatchObject({
    channelId,
    status: 'opening',
    turnNum: 0,
  });

  await b.pushMessage(getPayloadFor(participantB.participantId, postFundA.outbox));

  const resultA1 = await a.pushMessage(getPayloadFor(participantA.participantId, postFundB.outbox));
  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  const resultB1 = await b.pushMessage(getPayloadFor(participantB.participantId, postFundA.outbox));
  expect(getChannelResultFor(channelId, resultB1.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
    // TODO: the fundingStatus is incorrect as the funding table is not joined with channels table
    //  when processing the pushMessage above
    // fundingStatus: 'Funded',
  });

  const closeA = await a.closeChannel({channelId});
  expect(closeA.channelResult).toMatchObject({
    status: 'closing',
    turnNum: 4,
    // TODO: the fundingStatus is incorrect as the funding table is not joined with channels table
    //  when processing the pushMessage above
    // fundingStatus: 'Funded',
  });

  const closeB = await b.pushMessage(getPayloadFor(participantB.participantId, closeA.outbox));
  expect(getChannelResultFor(channelId, closeB.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
    fundingStatus: 'Defunded',
  });

  const close2A = await a.pushMessage(getPayloadFor(participantA.participantId, closeB.outbox));
  expect(getChannelResultFor(channelId, close2A.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
    fundingStatus: 'Funded',
  });

  // Mine a few blocks, but not enough for the chain service to update holdings
  // Then wait 500ms so that, if the chain service incorrectly updated holdings,
  // then the updated holdings would have been processed by the wallet.
  await mineBlocks(3);
  await new Promise(r => setTimeout(r, 500));
  expect((await a.getState({channelId})).channelResult).toMatchObject({
    status: 'closed',
    turnNum: 4,
    fundingStatus: 'Funded',
  });

  await mineBlocks(2);

  const channelClosedA = await channelClosedAPromise;

  expect(channelClosedA.channelResult).toMatchObject({
    status: 'closed',
    turnNum: 4,
    fundingStatus: 'Defunded',
  });

  const aBalanceFinal = await getBalance(aAddress);
  const bBalanceFinal = await getBalance(bAddress);

  expect(BN.sub(aBalanceFinal, aBalanceInit)).toEqual(aFunding);
  expect(BN.sub(bBalanceFinal, bBalanceInit)).toEqual(bFunding);

  // TODO: remove this
  // The reason for the wait:
  // - B CloseChannel objective succeeds BEFORE AssetTransferred event arrives
  // - B has no funds in the channel, so B does not wait for an AssetTransferred event to complete the CloseObjective
  // - AssetTransferred event arrives to B after the test finishes running
  // - We see "Error: Unable to acquire a connection"
  // - The error does NOT fail the test
  await new Promise(r => setTimeout(r, 500));
}, 50_000);
