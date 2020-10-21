import {CreateChannelParams, Participant, Allocation} from '@statechannels/client-api-schema';
import {BN, makeDestination} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {defaultTestConfig} from '../../config';
import {Wallet} from '../../wallet';
import {getChannelResultFor, getPayloadFor, getSignedStateFor} from '../test-helpers';

const ETH_ASSET_HOLDER_ADDRESS = ethers.constants.AddressZero;

const a = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_B'});

let participantA: Participant;
let participantB: Participant;

jest.setTimeout(20_000);

beforeAll(async () => {
  await a.dbAdmin().createDB();
  await b.dbAdmin().createDB();
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);

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
  await Promise.all([a.destroy(), b.destroy()]);
  await a.dbAdmin().dropDB();
  await b.dbAdmin().dropDB();
});

/**
 * Create a directly funded channel that will be used as the ledger channel.
 *
 * Note that this is just a simplification of the direct-funding test.
 */
const createLedgerChannel = async (): Promise<string> => {
  const aDepositAmtETH = BN.from(10);
  const bDepositAmtETH = BN.from(10);
  const ledgerChannelArgs = {
    participants: [participantA, participantB],
    allocations: [
      {
        allocationItems: [
          {
            destination: participantA.destination,
            amount: aDepositAmtETH,
          },
          {
            destination: participantB.destination,
            amount: bDepositAmtETH,
          },
        ],
        token: ETH_ASSET_HOLDER_ADDRESS,
      },
    ],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00',
    fundingStrategy: 'Direct' as const,
  };
  const resultA0 = await a.createChannel(ledgerChannelArgs);
  const channelId = resultA0.channelResults[0].channelId;
  await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));
  const resultB1 = await b.joinChannel({channelId});
  await a.pushMessage(getPayloadFor(participantA.participantId, resultB1.outbox));
  const fundingPostADeposit = {
    channelId,
    token: ETH_ASSET_HOLDER_ADDRESS,
    amount: aDepositAmtETH,
  };
  await a.updateFundingForChannels([fundingPostADeposit]);
  await b.updateFundingForChannels([fundingPostADeposit]);
  const fundingPostBDeposit = {
    channelId,
    token: ETH_ASSET_HOLDER_ADDRESS,
    amount: BN.add(aDepositAmtETH, bDepositAmtETH),
  };
  const resultA2 = await a.updateFundingForChannels([fundingPostBDeposit]);
  await b.updateFundingForChannels([fundingPostBDeposit]);
  const resultB3 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA2.outbox));
  await a.pushMessage(getPayloadFor(participantA.participantId, resultB3.outbox));

  a.__setLedger(channelId, ETH_ASSET_HOLDER_ADDRESS);
  b.__setLedger(channelId, ETH_ASSET_HOLDER_ADDRESS);

  return channelId;
};

afterEach(() => {
  a.store.ledgers = {};
  b.store.ledgers = {};
});

describe('Funding a single channel', () => {
  it('can fund a channel by ledger between two wallets ', async () => {
    const ledgerChannelId = await createLedgerChannel();

    // TODO: Play around with these numbers and test underflow scenarios
    const allocation: Allocation = {
      allocationItems: [
        {
          destination: participantA.destination,
          amount: BN.from(1),
        },
        {
          destination: participantB.destination,
          amount: BN.from(1),
        },
      ],
      token: ETH_ASSET_HOLDER_ADDRESS, // must be even length
    };

    const createChannelParams: CreateChannelParams = {
      participants: [participantA, participantB],
      allocations: [allocation],
      appDefinition: ethers.constants.AddressZero,
      appData: '0x00', // must be even length
      fundingStrategy: 'Ledger',
    };

    //        A <> B
    // PreFund0
    const resultA0 = await a.createChannel(createChannelParams);

    // TODO compute the channelId for a better test
    const channelId = resultA0.channelResults[0].channelId;

    expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
      status: 'opening',
      turnNum: 0,
    });

    expect(getSignedStateFor(channelId, resultA0.outbox)).toMatchObject(
      {turnNum: 0} // The application's post fund
    );

    //    > PreFund0A
    const resultB0 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA0.outbox)
    );

    expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
      status: 'proposed',
      turnNum: 0,
    });

    //       PreFund0B
    //   LedgerUpdateB
    const resultB1 = await b.joinChannel({channelId});

    expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
      status: 'opening',
      turnNum: 1,
    });

    expect(getSignedStateFor(ledgerChannelId, resultB1.outbox)).toMatchObject({turnNum: 5});

    expect(getSignedStateFor(channelId, resultB1.outbox)).toMatchObject(
      {turnNum: 1} // The application's pre fund
    );

    //        PreFund0B <
    //    LedgerUpdateB <
    // LedgerUpdateA
    // PostFund2A
    const resultA1 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
      status: 'running',
      turnNum: 2,
    });

    expect(getSignedStateFor(ledgerChannelId, resultA1.outbox)).toMatchObject({turnNum: 5});
    expect(getSignedStateFor(channelId, resultA1.outbox)).toMatchObject(
      {turnNum: 2} // The application's post fund
    );

    // > PostFund3A
    // > LedgerUpdateA
    //     PostFund3B
    const resultB3 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );

    expect(getChannelResultFor(channelId, resultB3.channelResults)).toMatchObject({
      status: 'running',
      turnNum: 3,
    });

    expect(getSignedStateFor(channelId, resultB3.outbox)).toMatchObject(
      {turnNum: 3} // The application's post fund)
    );

    //    PostFund3B <
    const resultA3 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB3.outbox)
    );

    expect(getChannelResultFor(channelId, resultA3.channelResults)).toMatchObject({
      status: 'running',
      turnNum: 3,
    });
  });
});

describe('Funding multiple channels syncronously (in bulk)', () => {
  const N = 10; // beforeEach creates a ledger channel with 10 ETH each

  it(`can fund ${N} channels by ledger proposed by Alice`, async () => {
    const ledgerChannelId = await createLedgerChannel();

    // TODO: Play around with these numbers and test underflow scenarios
    const allocation: Allocation = {
      allocationItems: [
        {
          destination: participantA.destination,
          amount: BN.from(1),
        },
        {
          destination: participantB.destination,
          amount: BN.from(1),
        },
      ],
      token: ETH_ASSET_HOLDER_ADDRESS, // must be even length
    };

    const createChannelParams: CreateChannelParams = {
      participants: [participantA, participantB],
      allocations: [allocation],
      appDefinition: ethers.constants.AddressZero,
      appData: '0x00', // must be even length
      fundingStrategy: 'Ledger',
    };

    // PreFund0A-1
    // PreFund0A-2
    const resultA0 = await a.createChannels(createChannelParams, N);

    const appChannels = resultA0.channelResults;

    //    > PreFund0A-1
    //    > PreFund0A-2
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

    //           PreFund0B-1
    //           PreFund0B-2
    //     LedgerUpdateB-1+2
    const resultB1 = await b.joinChannels(appChannels.map(c => c.channelId));

    expect(getSignedStateFor(ledgerChannelId, resultB1.outbox)).toMatchObject({turnNum: 5});

    for (const channel of appChannels) {
      expect(getSignedStateFor(channel.channelId, resultB1.outbox)).toMatchObject({turnNum: 1});
    }

    //       PreFund0B-1 <
    //       PreFund0B-2 <
    // LedgerUpdateB-1+2 <
    // LedgerUpdateA-1+2
    // PostFundA-1
    // PostFundA-2
    const resultA1 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(getSignedStateFor(ledgerChannelId, resultA1.outbox)).toMatchObject({turnNum: 5});

    for (const channel of appChannels) {
      expect(getSignedStateFor(channel.channelId, resultA1.outbox)).toMatchObject({turnNum: 2});
    }

    //       > LedgerUpdateA-1+2
    //       > PostFundA-1
    //       > PostFundA-2
    //       PostFundB-1
    //       PostFundB-2
    const resultB2 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );

    for (const channel of appChannels) {
      expect(getSignedStateFor(channel.channelId, resultB2.outbox)).toMatchObject({turnNum: 3});
    }

    //      < PostFundB-1
    //      < PostFundB-2
    const resultA3 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB2.outbox)
    );

    expect(resultA3.outbox).toMatchObject([]);
  });
});

describe('Funding multiple channels concurrently (one sided)', () => {
  it('can fund 2 channels by ledger, both proposed by Alice', async () => {
    const ledgerChannelId = await createLedgerChannel();

    // TODO: Play around with these numbers and test underflow scenarios
    const allocation: Allocation = {
      allocationItems: [
        {
          destination: participantA.destination,
          amount: BN.from(1),
        },
        {
          destination: participantB.destination,
          amount: BN.from(1),
        },
      ],
      token: ETH_ASSET_HOLDER_ADDRESS, // must be even length
    };

    const createChannelParams: CreateChannelParams = {
      participants: [participantA, participantB],
      allocations: [allocation],
      appDefinition: ethers.constants.AddressZero,
      appData: '0x00', // must be even length
      fundingStrategy: 'Ledger',
    };

    // PreFund0A-1
    const resultA0 = await a.createChannel(createChannelParams);
    // PreFund0A-2
    const resultA0alt = await a.createChannel(createChannelParams);

    // TODO compute the channelId1 for a better test
    const channelId1 = resultA0.channelResults[0].channelId;
    const channelId2 = resultA0alt.channelResults[0].channelId;

    //    > PreFund0A-1
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));
    //    > PreFund0A-2
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA0alt.outbox));

    //         PreFund0B-1
    //     LedgerUpdateB-1
    const resultB1 = await b.joinChannel({channelId: channelId1});

    expect(getSignedStateFor(ledgerChannelId, resultB1.outbox)).toMatchObject(
      {turnNum: 5} // Funding channel 1 only
    );

    expect(getSignedStateFor(channelId1, resultB1.outbox)).toMatchObject(
      {turnNum: 1} // Application 1's pre fund
    );

    //         PreFund0B-2
    const resultB1alt = await b.joinChannel({channelId: channelId2});

    // ⚠️ IMPORTANT ⚠️
    // Since B already sent LedgerUpdateB-1 he does not sign any new update
    expect(getSignedStateFor(channelId2, resultB1alt.outbox)).toMatchObject(
      {turnNum: 1} // Application 2's pre fund
    );

    // PreFund0B-1 <
    // LedgerUpdateB-1 <
    // LedgerUpdateA-1
    // PostFundA-1
    const resultA1 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(getSignedStateFor(ledgerChannelId, resultA1.outbox)).toMatchObject({turnNum: 5});
    expect(getSignedStateFor(channelId1, resultA1.outbox)).toMatchObject(
      {turnNum: 2} // Application 1's post fund
    );

    // PreFund0B-2 <
    // LedgerUpdateA-2
    const resultA1alt = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1alt.outbox)
    );

    expect(getSignedStateFor(ledgerChannelId, resultA1alt.outbox)).toMatchObject({turnNum: 7});

    //       > LedgerUpdateA-1
    //       > PostFundA-1
    //       LedgerUpdateB-2
    //       PostFundB-1
    const resultB2 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );

    expect(getSignedStateFor(ledgerChannelId, resultB2.outbox)).toMatchObject({turnNum: 7});
    expect(getSignedStateFor(channelId1, resultB2.outbox)).toMatchObject(
      {turnNum: 3} // Application 1's post fund
    );

    //       > LedgerUpdateA-2
    const resultB2alt = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1alt.outbox)
    );

    expect(resultB2alt.outbox).toMatchObject([]);

    //      < LedgerUpdateB-2
    //      < PostFundB-1
    // PostFundA-2
    const resultA3 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB2.outbox)
    );

    expect(getSignedStateFor(channelId2, resultA3.outbox)).toMatchObject(
      {turnNum: 2} // Application 2's post fund)
    );

    //       > LedgerUpdateA-2
    //       PostFundB-2
    const resultB3alt = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA3.outbox)
    );

    expect(getSignedStateFor(channelId2, resultB3alt.outbox)).toMatchObject(
      {turnNum: 3} // Application 2's post fund)
    );
  });
});

describe('Funding multiple channels concurrently (two sides)', () => {
  it('can fund 2 channels by ledger, different proposers for each', async () => {
    const ledgerChannelId = await createLedgerChannel();

    // TODO: Play around with these numbers and test underflow scenarios
    const allocation: Allocation = {
      allocationItems: [
        {
          destination: participantA.destination,
          amount: BN.from(1),
        },
        {
          destination: participantB.destination,
          amount: BN.from(1),
        },
      ],
      token: ETH_ASSET_HOLDER_ADDRESS, // must be even length
    };

    const createChannelParams: CreateChannelParams = {
      participants: [participantA, participantB],
      allocations: [allocation],
      appDefinition: ethers.constants.AddressZero,
      appData: '0x00', // must be even length
      fundingStrategy: 'Ledger',
    };

    // PreFund0A-1
    const resultA0 = await a.createChannel(createChannelParams);
    const channelId1 = resultA0.channelResults[0].channelId;

    //    > PreFund0A-1
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

    // PreFund0B-2
    const resultB0 = await b.createChannel(createChannelParams);
    const channelId2 = resultB0.channelResults[0].channelId;

    // PreFund0B-2 <
    await a.pushMessage(getPayloadFor(participantA.participantId, resultB0.outbox));

    //         PreFund0B-1
    //     LedgerUpdateB-1
    const resultB1 = await b.joinChannel({channelId: channelId1});

    expect(getSignedStateFor(ledgerChannelId, resultB1.outbox)).toMatchObject(
      {turnNum: 5} // Funding channel 1 only
    );

    expect(getSignedStateFor(channelId1, resultB1.outbox)).toMatchObject(
      {turnNum: 1} // Application 1's pre fund (1 b/c Bob is second in array)
    );

    // PreFund0A-2
    // LedgerUpdateA-2
    const resultA1 = await a.joinChannel({channelId: channelId2});

    expect(getSignedStateFor(ledgerChannelId, resultA1.outbox)).toMatchObject(
      {turnNum: 5} // Funding channel 2 only
    );

    expect(getSignedStateFor(channelId2, resultA1.outbox)).toMatchObject(
      {turnNum: 0} // Application 2's pre fund (0 b/c Alice is first in array)
    );

    // PreFund0B-1 <
    // LedgerUpdateB-1 <
    // LedgerUpdateA-null
    const resultA2 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(getSignedStateFor(ledgerChannelId, resultA2.outbox)).toMatchObject(
      {turnNum: 7} // The ledger channel counterproposal (just funding 1))
    );

    //     > PreFund0A-2 <
    //     > LedgerUpdateA-2
    //     LedgerUpdateB-null
    const resultB2 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );

    expect(getSignedStateFor(ledgerChannelId, resultB2.outbox)).toMatchObject(
      {turnNum: 7} // The ledger channel counterproposal (null effect))
    );

    // LedgerUpdateB-null <
    // LedgerUpdateA-1+2
    const resultA3 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB2.outbox)
    );

    expect(resultA3.outbox[0].params.data).toMatchObject({
      signedStates: [{channelId: ledgerChannelId, turnNum: 9}],
    });

    //     > LedgerUpdateA-null
    //     LedgerUpdateB-1+2
    const resultB3 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA2.outbox)
    );

    expect(resultB3.outbox[0].params.data).toMatchObject({
      signedStates: [{channelId: ledgerChannelId, turnNum: 9}],
    });

    // LedgerUpdateB-1+2 <
    // PostFundA-1
    // PostFundA-2
    const resultA4 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB3.outbox)
    );

    expect(getSignedStateFor(channelId1, resultA4.outbox)).toMatchObject(
      {turnNum: 2} // Application 1's post fund
    );

    expect(getSignedStateFor(channelId2, resultA4.outbox)).toMatchObject(
      {turnNum: 2} // Application 2's post fund
    );

    //     > LedgerUpdateA-1+2
    const resultB4 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA3.outbox)
    );

    expect(resultB4.outbox).toMatchObject([]);

    //     > PostFundA-1
    //     > PostFundA-2
    //       PostFundB-1
    //       PostFundB-2
    const resultB5 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA4.outbox)
    );

    expect(getSignedStateFor(channelId1, resultB5.outbox)).toMatchObject(
      {turnNum: 3} // Application 1's post fund
    );

    expect(getSignedStateFor(channelId2, resultB5.outbox)).toMatchObject(
      {turnNum: 3} // Application 2's post fund
    );

    // PostFundB-1 <
    // PostFundB-2 <
    const resultA5 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB5.outbox)
    );

    expect(resultA5.outbox).toMatchObject([]);
  });
});
