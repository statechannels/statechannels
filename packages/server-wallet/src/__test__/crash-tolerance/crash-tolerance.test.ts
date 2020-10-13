import {
  CreateChannelParams,
  Participant,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {BigNumber, ethers} from 'ethers';

import {processEnvConfig} from '../../config';
import {Wallet} from '../../wallet';
import {getChannelResultFor, getPayloadFor} from '../test-helpers';

const a = new Wallet({...processEnvConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...processEnvConfig, postgresDBName: 'TEST_B'}); // Wallet that will "crash"
const b2 = new Wallet({...processEnvConfig, postgresDBName: 'TEST_B'}); // Wallet that will "restart" (same db)
// TODO needs to have same signing address as b? Pass in thru config

let channelId: string;
let participantA: Participant;
let participantB: Participant;

beforeAll(async () => {
  await a.dbAdmin().createDB();
  await b.dbAdmin().createDB();
  await b2.dbAdmin().createDB();
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB(), b2.dbAdmin().migrateDB()]);

  participantA = {
    signingAddress: await a.getSigningAddress(),
    participantId: 'a',
    destination: makeDestination(
      '0xaaaa000000000000000000000000000000000000000000000000000000000001'
    ),
  };
  participantB = {
    signingAddress: await b.getSigningAddress(),
    participantId: 'b',
    destination: makeDestination(
      '0xbbbb000000000000000000000000000000000000000000000000000000000002'
    ),
  };
});
afterAll(async () => {
  // Don't destory b here, it get's destroyed midway through test
  await Promise.all([a.destroy(), b2.destroy()]);
  await a.dbAdmin().dropDB();
  await b2.dbAdmin().dropDB(); // Only need to drop the db once as it is shared with b
});

it.only('Create a fake-funded channel between two wallets ', async () => {
  const allocation: Allocation = {
    allocationItems: [
      {destination: participantA.destination, amount: BigNumber.from(1).toHexString()},
      {destination: participantB.destination, amount: BigNumber.from(1).toHexString()},
    ],
    token: '0x00', // must be even length
  };

  const createChannelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00', // must be even length
    fundingStrategy: 'Direct',
  };

  //        A <> B
  // PreFund0
  const resultA0 = await a.createChannel(createChannelParams);

  // TODO compute the channelId for a better test
  channelId = resultA0.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  //    > PreFund0A
  const resultB0 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  // Destory Wallet b and restart Wallet b2
  await b.destroy();

  //      PreFund0B
  const resultB1 = await b2.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  //  PreFund0B <
  const resultA1 = await a.pushMessage(getPayloadFor(participantA.participantId, resultB1.outbox));

  /**
   * In this case, there is no auto-advancing to the running stage. Instead we have
   * an intermediate 'opening' stage where each party must fund their channel. A funds
   * first, and then B funds. A and B both signs turnNum 3 on the call to updateFundingForChannels
   * and then sends the newly signed state to each other at the same time.
   */

  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const depositByA = {channelId, token: '0x00', amount: BigNumber.from(1).toHexString()}; // A sends 1 ETH (1 total)

  // This would have been triggered by A's Chain Service by request
  await a.updateFundingForChannels([depositByA]);
  await b2.updateFundingForChannels([depositByA]);

  // Then, this would be triggered by B's Chain Service after observing A's deposit
  const depositByB = {channelId, token: '0x00', amount: BigNumber.from(2).toHexString()}; // B sends 1 ETH (2 total)

  // < PostFund3B
  const resultA2 = await a.updateFundingForChannels([depositByB]);

  // PostFund3A >
  const resultB2 = await b2.updateFundingForChannels([depositByB]);

  expect(getChannelResultFor(channelId, resultA2.channelResults)).toMatchObject({
    status: 'opening', // Still opening because turnNum 3 is not supported yet, but is signed by A
    turnNum: 0,
  });

  expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
    status: 'opening', // Still opening because turnNum 3 is not supported yet, but is signed by B
    turnNum: 0,
  });

  //  PostFund3B <
  const resultA3 = await a.pushMessage(getPayloadFor(participantA.participantId, resultB2.outbox));
  expect(getChannelResultFor(channelId, resultA3.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  //  > PostFund3A
  const resultB3 = await b2.pushMessage(getPayloadFor(participantB.participantId, resultA2.outbox));
  expect(getChannelResultFor(channelId, resultB3.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
});

it('Rejects b closing with `not your turn`', async () => {
  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  const bCloseChannel = b2.closeChannel(closeChannelParams);

  await expect(bCloseChannel).rejects.toMatchObject(new Error('not my turn'));
});

it('Closes the channel', async () => {
  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  // A generates isFinal4
  const aCloseChannelResult = await a.closeChannel(closeChannelParams);

  expect(getChannelResultFor(channelId, [aCloseChannelResult.channelResult])).toMatchObject({
    status: 'closing',
    turnNum: 4,
  });

  const bPushMessageResult = await b.pushMessage(
    getPayloadFor(participantB.participantId, aCloseChannelResult.outbox)
  );

  // B pushed isFinal4, generated countersigned isFinal4
  expect(getChannelResultFor(channelId, bPushMessageResult.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });

  // A pushed the countersigned isFinal4
  const aPushMessageResult = await a.pushMessage(
    getPayloadFor(participantA.participantId, bPushMessageResult.outbox)
  );

  expect(getChannelResultFor(channelId, aPushMessageResult.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });
});
