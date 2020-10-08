import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';

import {makeDestination} from '@statechannels/wallet-core';
import {BigNumber, ethers} from 'ethers';
import {defaultConfig} from '../config';

// Spin up Wallets for A and B
// A calls createChannel(X, 'fake-funding')
// Assert A gets the correct ChannelResult.results
// push outbox into B

// Assert that we get a joinChannel notification
// b.wallet.joinChannel
// Assert that the channel result says 'funded'
// (Is there also a notification? Probably not...)
// push outbox into A
// A should get a ChannelResult with 'funded and running'
// push outbox into B
// B should get a ChannelResult with 'running'

import {Wallet} from '../wallet';
import {getChannelResultFor, getPayloadFor} from './test-helpers';

// Assume that DBs with these names exist.
const a = new Wallet({...defaultConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...defaultConfig, postgresDBName: 'TEST_B'});

beforeAll(async () => {
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);
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
      {destination: participantA.destination, amount: BigNumber.from(1).toHexString()},
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

  const resultA = await a.createChannel(channelParams);

  // TODO compute the channelId for a better test
  const channelId = resultA.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, resultA.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  const resultB = await b.pushMessage(getPayloadFor(participantB.participantId, resultA.outbox));

  expect(getChannelResultFor(channelId, resultB.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });
});
