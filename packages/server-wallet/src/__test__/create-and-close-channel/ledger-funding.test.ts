import {
  CreateChannelParams,
  Participant,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {BN, makeDestination} from '@statechannels/wallet-core';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';
import {ethers} from 'ethers';

import {defaultTestConfig} from '../../config';
import {Wallet} from '../../wallet';
import {getChannelResultFor, getPayloadFor} from '../test-helpers';

const a = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_B'});

let participantA: Participant;
let participantB: Participant;

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
let ledgerChannelId: string;
beforeEach(async () => {
  const aDepositAmtETH = BN.from(5);
  const bDepositAmtETH = BN.from(5);
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

  // FIXME: Should not need to do this
  a.__setLedger(channelId, ETH_ASSET_HOLDER_ADDRESS);
  b.__setLedger(channelId, ETH_ASSET_HOLDER_ADDRESS);
  ledgerChannelId = channelId;
});

afterEach(async () => {
  // TODO: Add to the truncate / dropDB method
  a.store.eraseLedgerDataFromMemory();
  b.store.eraseLedgerDataFromMemory();
});

describe('Funding a single channel', () => {
  /**
   * App channel used for the next three tests (open & close)
   */
  let channelId: string;

  it('can fund a channel by ledger between two wallets ', async () => {
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
    channelId = resultA0.channelResults[0].channelId;

    expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
      status: 'opening',
      turnNum: 0,
    });

    expect(resultA0.outbox[0].params.data).toMatchObject({
      signedStates: [
        {turnNum: 0}, // The application's post fund
      ],
    });

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

    expect(resultB1.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 5},
        {turnNum: 1}, // The application's pre fund
      ],
    });

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

    expect(resultA1.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 5},
        {turnNum: 2}, // The application's post fund
      ],
    });

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

    expect(resultB3.outbox[0].params.data).toMatchObject({
      signedStates: [
        {turnNum: 3}, // The application's post fund
      ],
    });

    //    PostFund3B <
    const resultA3 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB3.outbox)
    );

    expect(getChannelResultFor(channelId, resultA3.channelResults)).toMatchObject({
      status: 'running',
      turnNum: 3,
    });
  });

  it('rejects b closing with `not your turn`', async () => {
    const closeChannelParams: CloseChannelParams = {
      channelId,
    };

    const bCloseChannel = b.closeChannel(closeChannelParams);

    await expect(bCloseChannel).rejects.toMatchObject(new Error('not my turn'));
  });

  it('can close a ledger funded channel', async () => {
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
});

describe('Funding multiple channels concurrently', () => {
  it('can fund 2 channels by ledger, both proposed by Alice', async () => {
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

    expect(resultB1.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 5}, // Funding channel 1 only
        {turnNum: 1}, // Application 1's pre fund
      ],
    });

    //         PreFund0B-2
    const resultB1alt = await b.joinChannel({channelId: channelId2});

    // ⚠️ IMPORTANT ⚠️
    // Since B already sent LedgerUpdateB-1, he does not sign any new update
    expect(resultB1alt.outbox[0].params.data).toMatchObject({
      signedStates: [
        {turnNum: 1}, // Application 2's pre fund
      ],
    });

    // PreFund0B-1 <
    // LedgerUpdateB-1 <
    // LedgerUpdateA-1
    // PostFundA-1
    const resultA1 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(resultA1.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 5},
        {turnNum: 2}, // Application 1's post fund
      ],
    });

    // PreFund0B-2 <
    // LedgerUpdateA-2
    const resultA1alt = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1alt.outbox)
    );

    expect(resultA1alt.outbox[0].params.data).toMatchObject({
      signedStates: [{channelId: ledgerChannelId, turnNum: 7}],
    });

    //       > LedgerUpdateA-1
    //       > PostFundA-1
    //       LedgerUpdateB-2
    //       PostFundB-1
    const resultB2 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );

    expect(resultB2.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 7},
        {channelId: channelId1, turnNum: 3}, // Application 1's post fund
      ],
    });

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

    expect(resultA3.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: channelId2, turnNum: 2}, // Application 2's post fund
      ],
    });

    //       > LedgerUpdateA-2
    //       PostFundB-2
    const resultB3alt = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA3.outbox)
    );

    expect(resultB3alt.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: channelId2, turnNum: 3}, // Application 2's post fund
      ],
    });
  });

  it('can fund 2 channels by ledger, different proposers for each', async () => {
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

    expect(resultB1.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 5}, // Funding channel 1 only
        {turnNum: 1}, // Application 1's pre fund (1 b/c Bob is second in array)
      ],
    });

    // PreFund0A-2
    // LedgerUpdateA-2
    const resultA1 = await a.joinChannel({channelId: channelId2});

    expect(resultA1.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: ledgerChannelId, turnNum: 5}, // Funding channel 2 only
        {turnNum: 0}, // Application 2's pre fund (0 b/c Alice is first in array)
      ],
    });

    // PreFund0B-1 <
    // LedgerUpdateB-1 <
    // LedgerUpdateA-null
    const resultA2 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB1.outbox)
    );

    expect(resultA2.outbox[0].params.data).toMatchObject({
      signedStates: [
        {turnNum: 7}, // The ledger channel counterproposal (just funding 1)
      ],
    });

    //     > PreFund0A-2 <
    //     > LedgerUpdateA-2
    //     LedgerUpdateB-null
    const resultB2 = await b.pushMessage(
      getPayloadFor(participantB.participantId, resultA1.outbox)
    );

    expect(resultB2.outbox[0].params.data).toMatchObject({
      signedStates: [
        {turnNum: 7}, // The ledger channel counterproposal (null effect)
      ],
    });

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

    expect(resultA4.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: channelId1, turnNum: 2}, // Application 1's post fund
        {channelId: channelId2, turnNum: 2}, // Application 2's post fund
      ],
    });

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

    expect(resultB5.outbox[0].params.data).toMatchObject({
      signedStates: [
        {channelId: channelId1, turnNum: 3}, // Application 1's post fund
        {channelId: channelId2, turnNum: 3}, // Application 2's post fund
      ],
    });

    // PostFundB-1 <
    // PostFundB-2 <
    const resultA5 = await a.pushMessage(
      getPayloadFor(participantA.participantId, resultB5.outbox)
    );

    expect(resultA5.outbox).toMatchObject([]);
  });
});
