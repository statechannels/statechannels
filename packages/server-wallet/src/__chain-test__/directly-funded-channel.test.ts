import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {BN, makeAddress, makeDestination} from '@statechannels/wallet-core';
import {BigNumber, constants, ethers, providers} from 'ethers';
import {fromEvent} from 'rxjs';
import {take} from 'rxjs/operators';

import {defaultTestConfig} from '../config';
import {ObjectiveSucceededValue, SingleChannelOutput, Wallet} from '../wallet';
import {getChannelResultFor, getPayloadFor} from '../__test__/test-helpers';

if (!defaultTestConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = defaultTestConfig.rpcEndpoint;
let provider: providers.JsonRpcProvider;
const b = Wallet.create({
  ...defaultTestConfig,
  postgresDBName: 'TEST_B',
  /* eslint-disable-next-line no-process-env */
  ethereumPrivateKey: process.env.CHAIN_SERVICE_PK ?? ETHERLIME_ACCOUNTS[1].privateKey,
});
const a = Wallet.create({
  ...defaultTestConfig,
  postgresDBName: 'TEST_A',
  /* eslint-disable-next-line no-process-env */
  ethereumPrivateKey: process.env.CHAIN_SERVICE_PK2 ?? ETHERLIME_ACCOUNTS[2].privateKey,
});

const aAddress = '0x50Bcf60D1d63B7DD3DAF6331a688749dCBD65d96';
const bAddress = '0x632d0b05c78A83cEd439D3bd6C710c4814D3a6db';

const aFunding = BN.from(1);
const bFunding = BN.from(0);

async function getBalance(address: string): Promise<BigNumber> {
  return await provider.getBalance(address);
}

beforeAll(async () => {
  provider = new providers.JsonRpcProvider(rpcEndpoint);
  await a.dbAdmin().createDB();
  await b.dbAdmin().createDB();
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);
});

afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await a.dbAdmin().dropDB();
  await b.dbAdmin().dropDB();
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
    // eslint-disable-next-line
    assetHolderAddress: makeAddress(process.env.ETH_ASSET_HOLDER_ADDRESS as string),
  };

  const channelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: constants.HashZero,
    fundingStrategy: 'Direct',
  };

  // the type assertion is due to
  // https://github.com/devanshj/rxjs-from-emitter/blob/master/docs/solving-some-from-event-flaws.md#the-way-fromevent-checks-if-the-first-argument-passed-is-an-emitter-or-not-is-incorrect
  const postFundAPromise = fromEvent<SingleChannelOutput>(a as any, 'channelUpdated')
    .pipe(take(2))
    .toPromise();

  const postFundBPromise = fromEvent<SingleChannelOutput>(b as any, 'channelUpdated')
    .pipe(take(2))
    .toPromise();

  const closeCompletedA = fromEvent<ObjectiveSucceededValue>(a as any, 'objectiveSucceeded')
    .pipe(take(2))
    .toPromise();

  const closeCompletedB = fromEvent<ObjectiveSucceededValue>(b as any, 'objectiveSucceeded')
    .pipe(take(2))
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
    turnNum: 1,
  });

  const resultA0 = await a.pushMessage(getPayloadFor(participantA.participantId, prefundB.outbox));

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 1,
  });

  const postFundA = await postFundAPromise;
  const postFundB = await postFundBPromise;

  expect(postFundA.channelResult).toMatchObject({
    channelId,
    status: 'opening',
    turnNum: 2,
  });

  expect(postFundB.channelResult).toMatchObject({
    channelId,
    status: 'opening',
    turnNum: 1,
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
  });

  const closeA = await a.closeChannel({channelId});
  expect(closeA.channelResult).toMatchObject({
    status: 'closing',
    turnNum: 4,
  });

  const closeB = await b.pushMessage(getPayloadFor(participantB.participantId, closeA.outbox));
  expect(getChannelResultFor(channelId, closeB.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });

  const close2A = await a.pushMessage(getPayloadFor(participantA.participantId, closeB.outbox));
  expect(getChannelResultFor(channelId, close2A.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });

  expect(await closeCompletedA).toMatchObject({
    channelId,
    objectiveType: 'CloseChannel',
  });
  expect(await closeCompletedB).toMatchObject({
    channelId,
    objectiveType: 'CloseChannel',
  });

  const aBalanceFinal = await getBalance(aAddress);
  const bBalanceFinal = await getBalance(bAddress);

  expect(BN.sub(aBalanceFinal, aBalanceInit)).toEqual(aFunding);
  expect(BN.sub(bBalanceFinal, bBalanceInit)).toEqual(bFunding);

  // todo: remove this
  // The reason for the wait:
  // - B CloseChannel objective succeeds BEFORE AssetTransferred event arrives
  // - B has no funds in the channel, so B does not wait for an AssetTransferred event to complete the CloseObjective
  // - AssetTransferred event arrives to B after the test finishes running
  // - We see "Error: Unable to acquire a connection"
  // - The error does NOT fail the test
  await new Promise(r => setTimeout(r, 500));
}, 50_000);
