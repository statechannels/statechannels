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

const testCases: FundingStrategy[] = ['Unfunded', 'Direct' /*, 'Ledger', 'Virtual'*/];

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
        {destination: participantB.destination, amount: BigNumber.from(1).toHexString()},
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

    //    > PreFund0A
    const resultB0 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA0.outbox)
    );

    expect(resultB0.objectivesToApprove).toBeDefined();
    expect(resultB0.objectivesToApprove).toHaveLength(1);
    const objective = /* eslint-disable-line */ resultB0.objectivesToApprove![0]
    expect(objective).toMatchObject({
      type: 'OpenChannel',
      data: {
        fundingStrategy,
        targetChannelId: channelId,
      },
    });

    expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
      status: 'proposed',
      turnNum: 0,
    });

    //      PreFund0B
    const resultB1 = await b.approveObjective(objective.objectiveId);
    expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
      status: 'opening',
      turnNum: 0,
    });

    // <split based on funding>
    const resultA1 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    if (fundingStrategy === 'Direct') {
      //  PreFund0B <
      resultA1;

      /**
       * In this case, there is no auto-advancing to the running stage. Instead we have
       * an intermediate 'funding' stage where each party must fund their channel. A funds
       * first, and then B funds. A and B both signs turnNum 3 on the call to updateFundingForChannels
       * and then sends the newly signed state to each other at the same time.
       */

      expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
        status: 'funding',
        turnNum: 0,
      });

      const depositByA = {channelId, token: '0x00', amount: BigNumber.from(1).toHexString()}; // A sends 1 ETH (1 total)

      // This would have been triggered by A's Chain Service by request
      await a.updateFundingForChannels([depositByA]);
      await b.updateFundingForChannels([depositByA]);

      // Then, this would be triggered by B's Chain Service after observing A's deposit
      const depositByB = {channelId, token: '0x00', amount: BigNumber.from(2).toHexString()}; // B sends 1 ETH (2 total)

      // < PostFund3B
      const resultA2 = await a.updateFundingForChannels([depositByB]);

      // PostFund3A >
      const resultB2 = await b.updateFundingForChannels([depositByB]);

      expect(getChannelResultFor(channelId, resultA2.channelResults)).toMatchObject({
        status: 'funding', // Still opening because turnNum 3 is not supported yet, but is signed by A
        turnNum: 0,
      });

      expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
        status: 'funding', // Still opening because turnNum 3 is not supported yet, but is signed by B
        turnNum: 0,
      });

      //  PostFund3B <
      const resultA3 = await a.pushMessage(
        getPayloadFor(participantA.participantId, resultB2.outbox)
      );
      expect(getChannelResultFor(channelId, resultA3.channelResults)).toMatchObject({
        status: 'running',
        turnNum: 3,
      });

      //  > PostFund3A
      const resultB3 = await b.pushMessage(
        getPayloadFor(participantB.participantId, resultA2.outbox)
      );
      expect(getChannelResultFor(channelId, resultB3.channelResults)).toMatchObject({
        status: 'running',
        turnNum: 3,
      });
    } else if (fundingStrategy === 'Unfunded') {
      //  PreFund0B & PostFund3B <
      // PostFund3A
      resultA1;

      /**
       * In this case, resultA1 auto-signed PostFundA0
       */
      expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
        status: 'running',
        turnNum: 3,
      });
      const resultB2 = await b.pushMessage(
        getPayloadFor(participantB.participantId, resultA1.outbox)
      );
      expect(getChannelResultFor(channelId, resultB2.channelResults)).toMatchObject({
        status: 'running',
        turnNum: 3,
      });
    }
  }
);
