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
  const aCreateChannelOutput = await a.createChannel(channelParams);

  // TODO compute the channelId for a better test
  const channelId = aCreateChannelOutput.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, aCreateChannelOutput.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // A sends PreFund0 to B
  const bProposeChannelPushOutput = await b.pushMessage(
    getPayloadFor(participantB.participantId, aCreateChannelOutput.outbox)
  );

  expect(getChannelResultFor(channelId, bProposeChannelPushOutput.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  // after joinChannel, B double-signs PreFund0
  const bJoinChannelOutput = await b.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [bJoinChannelOutput.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // B sends countersigned PreFund0 to A
  const aPushJoinChannelOutput = await a.pushMessage(
    getPayloadFor(participantA.participantId, bJoinChannelOutput.outbox)
  );

  expect(getChannelResultFor(channelId, aPushJoinChannelOutput.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  // Both A and B have PreFund states, we are now ready to fund
  const aFundOutput = await a.updateChannelFunding({channelId, token, amount: aBal});

  expect(getChannelResultFor(channelId, [aFundOutput.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0, // this is the currently latest _supported_ turnNum, not the latest turnNum
  });

  // A sends PostFund3 to B
  const bPushPostFundOutput = await b.pushMessage(
    getPayloadFor(participantB.participantId, aFundOutput.outbox)
  );
  expect(getChannelResultFor(channelId, bPushPostFundOutput.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const bFundOutput = await b.updateChannelFunding({channelId, token, amount: aBal});

  expect(getChannelResultFor(channelId, [bFundOutput.channelResult])).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  // B sends PostFund3 to A
  const aPushPostFundOutput = await a.pushMessage(
    getPayloadFor(participantA.participantId, bFundOutput.outbox)
  );
  // A has funding and a double-signed PostFund3
  expect(getChannelResultFor(channelId, aPushPostFundOutput.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
});
