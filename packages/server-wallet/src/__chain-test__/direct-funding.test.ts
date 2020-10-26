import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {BN, makeDestination} from '@statechannels/wallet-core';
import {BigNumber, ethers, providers} from 'ethers';
import {fromEvent} from 'rxjs';
import {take} from 'rxjs/operators';

import {defaultTestConfig} from '../config';
import {SingleChannelOutput, Wallet} from '../wallet';
import {getChannelResultFor, getPayloadFor} from '../__test__/test-helpers';

if (!defaultTestConfig.rpcEndpoint) throw new Error('rpc endpoint must be defined');
const rpcEndpoint = defaultTestConfig.rpcEndpoint;
let provider: providers.JsonRpcProvider;

const b = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_B'});
const a = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_A'});

const aAddress = '0x0000000000000000000000000000000000000001';
const bAddress = '0x0000000000000000000000000000000000000002';

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
        amount: BigNumber.from(1).toHexString(),
      },
      {
        destination: participantB.destination,
        amount: BigNumber.from(0).toHexString(),
      },
    ],
    token: '0x00', // must be even length
  };

  const channelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00', // must be even length
    fundingStrategy: 'Direct',
  };

  // the type assertion is due to
  // https://github.com/devanshj/rxjs-from-emitter/blob/master/docs/solving-some-from-event-flaws.md#the-way-fromevent-checks-if-the-first-argument-passed-is-an-emitter-or-not-is-incorrect
  const postFundAPromise = fromEvent<SingleChannelOutput>(a as any, 'channelUpdate')
    .pipe(take(2))
    .toPromise();

  const channelFundedBPromise = fromEvent<SingleChannelOutput>(b as any, 'channelUpdate')
    .pipe(take(2))
    .toPromise();

  //        A <> B
  // PreFund0
  const preFundA = await a.createChannel(channelParams);

  // TODO compute the channelId for a better test
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
  await channelFundedBPromise;
  expect(getChannelResultFor(channelId, [postFundA.channelResult])).toMatchObject({
    status: 'running',
    turnNum: 2,
  });

  const postFundB = await b.pushMessage(
    getPayloadFor(participantB.participantId, postFundA.outbox)
  );
  expect(getChannelResultFor(channelId, postFundB.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  const resultA1 = await a.pushMessage(getPayloadFor(participantA.participantId, postFundB.outbox));
  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
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

  const aBalanceFinal = await getBalance(aAddress);
  const bBalanceFinal = await getBalance(bAddress);
  expect(BN.sub(aBalanceFinal, aBalanceInit)).toEqual('0x01');
  expect(BN.sub(bBalanceFinal, bBalanceInit)).toEqual('0x00');
}, 10_000);
