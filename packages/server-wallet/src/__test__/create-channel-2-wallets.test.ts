import {execSync} from 'child_process';

import {
  CreateChannelParams,
  Participant,
  Allocation,
  FundingStrategy,
} from '@statechannels/client-api-schema';
import {makeDestination} from '@statechannels/wallet-core';
import {BigNumber, ethers} from 'ethers';

import {defaultConfig} from '../config';
import {Wallet} from '../wallet';

import {getChannelResultFor, getPayloadFor} from './test-helpers';

const a = new Wallet({...defaultConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...defaultConfig, postgresDBName: 'TEST_B'});

beforeAll(async () => {
  execSync('createdb TEST_A $PSQL_ARGS');
  execSync('createdb TEST_B $PSQL_ARGS');
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);
});
afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  execSync('dropdb TEST_A $PSQL_ARGS');
  execSync('dropdb TEST_B $PSQL_ARGS');
});

const testCases: FundingStrategy[] = ['Unfunded', 'Direct', 'Ledger', 'Virtual'];

it.each(testCases)(
  'Creates a %s-funded channel between two wallets ',
  async (fundingStrategy: FundingStrategy) => {
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
      fundingStrategy,
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

    //    > PreFund0
    const resultB0 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA0.outbox)
    );

    expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
      status: 'proposed',
      turnNum: 0,
    });

    //      PreFund1
    const resultB1 = await b.joinChannel({channelId});
    expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
      status: 'opening', // should this be 'funding' ?
      turnNum: 0,
    });

    //  PreFund1 <
    // PostFund2
    const resultA1 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
      status: 'funding', // should this be 'funding' ?
      turnNum: 0,
    });

    //    > PostFund2
    //      PostFund3
    const resultB2 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );
    expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
      status: 'running', // should this be 'running' ?
      turnNum: 0,
    });

    // PostFund3 <
    const resultA2 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB2.outbox)
    );
    expect(getChannelResultFor(channelId, resultA2.channelResults)).toMatchObject({
      status: 'running', // should this be 'running' ?
      turnNum: 0,
    });
  }
);
