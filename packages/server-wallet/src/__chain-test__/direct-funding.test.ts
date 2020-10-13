import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {BigNumber, ethers} from 'ethers';

import {defaultConfig} from '../config';
import {NotificationReceiver, SingleChannelMessage, Wallet} from '../wallet';
import {getChannelResultFor, getPayloadFor} from '../__test__/test-helpers';

const b = new Wallet({...defaultConfig, postgresDBName: 'TEST_B'});
const a = new Wallet({...defaultConfig, postgresDBName: 'TEST_A'});

beforeAll(async () => {
  await a.dbAdmin().createDB();
  await b.dbAdmin().createDB();
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);
});
afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await a.dbAdmin().dropDB();
  await b.dbAdmin().dropDB();
  a.destroy();
  b.destroy();
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

  let counter = 0;
  const p = new Promise<SingleChannelMessage>(resolve => {
    const aNotificationReceiver: NotificationReceiver = {
      onWalletNotification(message: SingleChannelMessage) {
        if (counter > 0) {
          resolve(message);
        }
        counter++;
      },
    };
    a.setNotificatonReceiver(aNotificationReceiver);
  });

  //        A <> B
  // PreFund0
  const preFundA = await a.createChannel(channelParams);

  // TODO compute the channelId for a better test
  const channelId = preFundA.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, preFundA.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  //    > PreFund0A
  const resultB0 = await b.pushMessage(getPayloadFor(participantB.participantId, preFundA.outbox));

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  //      PreFund0B
  const prefundB = await b.joinChannel({channelId});
  expect(getChannelResultFor(channelId, [prefundB.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  //  PreFund0B <
  const resultA0 = await a.pushMessage(getPayloadFor(participantA.participantId, prefundB.outbox));

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const postFundA = await p;
  await new Promise(r => setTimeout(r, 1_000));
  expect(getChannelResultFor(channelId, [postFundA.channelResult])).toMatchObject({
    status: 'opening', // Still opening because turnNum 3 is not supported yet, but is signed by A
    turnNum: 0,
  });

  //  PostFund3B <
  const resultB1 = await b.pushMessage(getPayloadFor(participantB.participantId, postFundA.outbox));
  expect(getChannelResultFor(channelId, resultB1.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  const postFundB = await b.syncChannel({channelId});

  const resultA1 = await a.pushMessage(getPayloadFor(participantA.participantId, postFundB.outbox));
  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
}, 20_000);
