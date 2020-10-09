import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {BigNumber, ethers} from 'ethers';

import {defaultConfig} from '../../config';
import {Wallet} from '../../wallet';
import {getChannelResultFor, getPayloadFor} from '../test-helpers';

const a = new Wallet({...defaultConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...defaultConfig, postgresDBName: 'TEST_B'});

beforeAll(async () => {
  await a.dbAdmin().createDB();
  await b.dbAdmin().createDB();
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);
});
afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await a.dbAdmin().dropDB();
  await b.dbAdmin().dropDB();
});

it('Create a fake-funded channel between two wallets ', async () => {
  const participantA: Participant = {
    signingAddress: await a.getSigningAddress(),
    participantId: 'a',
    destination: makeDestination(
      '0xaaaa000000000000000000000000000000000000000000000000000000000001'
    ),
  };
  const participantB: Participant = {
    signingAddress: await b.getSigningAddress(),
    participantId: 'b',
    destination: makeDestination(
      '0xbbbb000000000000000000000000000000000000000000000000000000000002'
    ),
  };

  const token = '0x00'; // must be even length
  const aBal = BigNumber.from(1).toHexString();

  const allocation: Allocation = {
    allocationItems: [{destination: participantA.destination, amount: aBal}],
    token,
  };

  const channelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00', // must be even length
    fundingStrategy: 'Direct',
  };

  //        A <> B
  // PreFund0
  const resultA0 = await a.createChannel(channelParams);

  // TODO compute the channelId for a better test
  const channelId = resultA0.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // A sends PreFund0 to B
  const resultB0 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  // after joinChannel, B generates PreFund1
  const resultB1 = await b.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // B sends countersigned PreFund0 to A
  const resultA1 = await a.pushMessage(getPayloadFor(participantA.participantId, resultB1.outbox));

  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // Both A and B have PreFund states, we are now ready to fund
  const resultA1b = await a.updateChannelFunding({channelId, token, amount: aBal});

  expect(getChannelResultFor(channelId, [resultA1b.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0, // this is the currently latest _supported_ turnNum, not the latest turnNum
  });

  // A sends PostFund3 to B
  const resultB2 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA1b.outbox));
  expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const resultB3 = await b.updateChannelFunding({channelId, token, amount: aBal});

  expect(getChannelResultFor(channelId, [resultB3.channelResult])).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
  // console.log('resultB2b', resultB2b);

  // B sends PostFund3 to A
  const resultA2 = await a.pushMessage(getPayloadFor(participantA.participantId, resultB3.outbox));
  // A has funding and a double-signed PostFund3
  expect(getChannelResultFor(channelId, resultA2.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
});
