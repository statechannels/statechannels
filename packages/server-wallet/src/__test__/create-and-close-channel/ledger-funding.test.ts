import {CreateChannelParams} from '@statechannels/client-api-schema';
import {BN, makeDestination, Participant} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {Outgoing} from '../..';
import {defaultTestConfig} from '../../config';
import {Bytes32} from '../../type-aliases';
import {Wallet} from '../../wallet';
import {crashAndRestart, getChannelResultFor, getPayloadFor} from '../test-helpers';

const ETH_ASSET_HOLDER_ADDRESS = ethers.constants.AddressZero;

let a = Wallet.create({...defaultTestConfig, postgresDBName: 'TEST_A'});
let b = Wallet.create({...defaultTestConfig, postgresDBName: 'TEST_B'});

let participantA: Participant;
let participantB: Participant;

jest.setTimeout(100_000);

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
const createLedgerChannel = async (aDeposit: number, bDeposit: number): Promise<string> => {
  const aDepositAmtETH = BN.from(aDeposit);
  const bDepositAmtETH = BN.from(bDeposit);
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
  };
  const resultA0 = await a.createLedgerChannel(ledgerChannelArgs);
  const channelId = resultA0.channelResult.channelId;
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
  const resultB3 = await b.updateFundingForChannels([fundingPostBDeposit]);
  await b.pushMessage(getPayloadFor(participantB.participantId, resultA2.outbox));
  await a.pushMessage(getPayloadFor(participantA.participantId, resultB3.outbox));

  // both wallets crash
  a = await crashAndRestart(a);
  b = await crashAndRestart(b);

  return channelId;
};

const testCreateChannelParams = (
  aAllocation: number,
  bAllocation: number,
  ledgerChannelId: string
): CreateChannelParams => ({
  participants: [participantA, participantB],
  allocations: [
    {
      allocationItems: [
        {
          destination: participantA.destination,
          amount: BN.from(aAllocation),
        },
        {
          destination: participantB.destination,
          amount: BN.from(bAllocation),
        },
      ],
      token: ETH_ASSET_HOLDER_ADDRESS, // must be even length
    },
  ],
  appDefinition: ethers.constants.AddressZero,
  appData: '0x00', // must be even length
  fundingStrategy: 'Ledger',
  fundingLedgerChannelId: ledgerChannelId,
});

async function exchangeMessagesBetweenAandB(bToA: Outgoing[][], aToB: Outgoing[][]) {
  while (aToB.length + bToA.length > 0) {
    const nextMessageFromB = bToA.shift();
    const nextMessageFromA = aToB.shift();

    // Helpful for debugging:
    // nextMessageFromA &&
    //   console.log(`A to B: ${JSON.stringify(nextMessageFromA[0].params.data, null, 2)}`);
    // nextMessageFromB &&
    //   console.log(`B to A: ${JSON.stringify(nextMessageFromB[0].params.data, null, 2)}`);

    const newFromA =
      nextMessageFromB &&
      (await a.pushMessage(getPayloadFor(participantA.participantId, nextMessageFromB)));

    const newFromB =
      nextMessageFromA &&
      (await b.pushMessage(getPayloadFor(participantB.participantId, nextMessageFromA)));

    newFromB?.outbox.length && bToA.push(newFromB.outbox);
    newFromA?.outbox.length && aToB.push(newFromA.outbox);
  }
}

describe('Funding a single channel with 100% of available ledger funds', () => {
  let ledgerChannelId: Bytes32;
  let appChannelId: Bytes32;

  afterAll(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it('can fund a channel by ledger between two wallets ', async () => {
    ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(10, 10, ledgerChannelId);

    const {
      channelResults: [{channelId}],
      outbox,
    } = await a.createChannel(params);

    await b.pushMessage(getPayloadFor(participantB.participantId, outbox));

    const {outbox: join} = await b.joinChannel({channelId});

    await exchangeMessagesBetweenAandB([join], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      turnNum: 5,
      status: 'running',
    });

    expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
      turnNum: 3,
      status: 'running',
    });

    expect(allocationItems).toContainAllocationItem({
      destination: channelId,
      amount: BN.from(20),
    });

    appChannelId = channelId;
  });

  it('closing said channel', async () => {
    const {outbox: close} = await a.closeChannel({channelId: appChannelId});

    await exchangeMessagesBetweenAandB([], [close]);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      turnNum: 7,
      status: 'running',
    });

    expect(getChannelResultFor(appChannelId, channelResults)).toMatchObject({
      turnNum: 4,
      status: 'closed',
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(10),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(10),
    });
  });
});

describe('Funding a single channel with 50% of ledger funds', () => {
  let ledgerChannelId: Bytes32;
  let appChannelId: Bytes32;

  afterAll(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it('can fund a channel by ledger between two wallets ', async () => {
    ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(5, 5, ledgerChannelId);

    const {
      channelResults: [{channelId}],
      outbox,
    } = await a.createChannel(params);

    await b.pushMessage(getPayloadFor(participantB.participantId, outbox));

    const {outbox: join} = await b.joinChannel({channelId});

    await exchangeMessagesBetweenAandB([join], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      turnNum: 5,
      status: 'running',
    });

    expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
      turnNum: 3,
      status: 'running',
    });

    expect(allocationItems).toContainAllocationItem({
      destination: channelId,
      amount: BN.from(10),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(5),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(5),
    });

    appChannelId = channelId;
  });

  it('closing said channel', async () => {
    const {outbox: close} = await a.closeChannel({channelId: appChannelId});

    await exchangeMessagesBetweenAandB([], [close]);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      turnNum: 7,
      status: 'running',
    });

    expect(getChannelResultFor(appChannelId, channelResults)).toMatchObject({
      turnNum: 4,
      status: 'closed',
    });

    expect(allocationItems).not.toContainEqual({destination: appChannelId});

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(10),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(10),
    });
  });
});

describe('Funding multiple channels syncronously (in bulk)', () => {
  const N = 4;
  let ledgerChannelId: Bytes32;
  let appChannelIds: Bytes32[];

  afterAll(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it(`can fund ${N} channels created in bulk by Alice`, async () => {
    ledgerChannelId = await createLedgerChannel(4, 4);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const resultA = await a.createChannels(params, N);
    const channelIds = resultA.channelResults.map(c => c.channelId);
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA.outbox));
    const resultB = await b.joinChannels(channelIds);

    await exchangeMessagesBetweenAandB([resultB.outbox], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      turnNum: 5,
      status: 'running',
    });

    expect(allocationItems).toHaveLength(N);

    for (const channelId of channelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }

    appChannelIds = channelIds;
  });

  it('can close them all (concurrently!)', async () => {
    // ⚠️ This results in several messages back and forth
    await exchangeMessagesBetweenAandB(
      [],
      await Promise.all(
        appChannelIds.map(async channelId => (await a.closeChannel({channelId})).outbox)
      )
    );

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      // 13 because there is a conflicting back-and-forth due to concurrent messages
      turnNum: 13,
      status: 'running',
    });

    for (const channelId of appChannelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 4,
        status: 'closed',
      });
      expect(allocationItems).not.toContainEqual({destination: channelId});
    }

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(4),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(4),
    });
  });
});

describe('Funding multiple channels concurrently (in bulk)', () => {
  const N = 2;
  let ledgerChannelId: Bytes32;
  let appChannelIds: Bytes32[];

  afterAll(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it(`can fund ${N * 2} channels created in bulk by Alice`, async () => {
    ledgerChannelId = await createLedgerChannel(N * 2, N * 2);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const createMessageAndJoinBatch = async (): Promise<Bytes32[]> => {
      const {outbox, channelResults} = await a.createChannels(params, N);
      const channelIds = channelResults.map(c => c.channelId);
      await b.pushMessage(getPayloadFor(participantB.participantId, outbox));
      const joinResults = await b.joinChannels(channelIds);
      await exchangeMessagesBetweenAandB([joinResults.outbox], []);
      return channelIds;
    };

    const results = await Promise.all([createMessageAndJoinBatch(), createMessageAndJoinBatch()]);

    const channelIds = results.flat();

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      turnNum: 5,
      status: 'running',
    });

    expect(allocationItems).toHaveLength(N * 2);

    for (const channelId of channelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }

    appChannelIds = channelIds;
  });

  it('can close them all (concurrently!)', async () => {
    // ⚠️ This results in several messages back and forth
    await exchangeMessagesBetweenAandB(
      [],
      await Promise.all(
        appChannelIds.map(async channelId => (await a.closeChannel({channelId})).outbox)
      )
    );

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger).toMatchObject({
      // 13 because there is a conflicting back-and-forth due to concurrent messages
      turnNum: 13,
      status: 'running',
    });

    for (const channelId of appChannelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 4,
        status: 'closed',
      });
      expect(allocationItems).not.toContainEqual({destination: channelId});
    }

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(4),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(4),
    });
  });
});

describe('Funding multiple channels syncronously without enough funds', () => {
  afterAll(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it(`can fund 4 channels created in bulk by Alice, rejecting 2 with no funds`, async () => {
    const ledgerChannelId = await createLedgerChannel(2, 2);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const resultA0 = await a.createChannels(params, 4); // 2 channels will be unfunded
    const channelIds = resultA0.channelResults.map(c => c.channelId);
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));
    const resultB1 = await b.joinChannels(channelIds);

    await exchangeMessagesBetweenAandB([resultB1.outbox], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    expect(allocationItems).toHaveLength(2);

    const unfundedChannels = channelResults.filter(c => c.status === 'opening');

    expect(unfundedChannels).toMatchObject([
      {
        turnNum: 1,
        status: 'opening',
      },
      {
        turnNum: 1,
        status: 'opening',
      },
    ]);

    for (const channelId of channelIds) {
      if (unfundedChannels.some(c => c.channelId === channelId)) continue;
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: makeDestination(channelId),
        amount: BN.from(2),
      });
    }
  });
});

describe('Funding multiple channels concurrently (one sided)', () => {
  afterAll(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it('can fund 2 channels by ledger both proposed by the same wallet', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const create1 = await a.createChannel(params);
    await b.pushMessage(getPayloadFor(participantB.participantId, create1.outbox));

    const create2 = await a.createChannel(params);
    await b.pushMessage(getPayloadFor(participantB.participantId, create2.outbox));

    const channelId1 = create1.channelResults[0].channelId;
    const channelId2 = create2.channelResults[0].channelId;

    const {outbox: join1} = await b.joinChannel({channelId: channelId1});
    const {outbox: join2} = await b.joinChannel({channelId: channelId2});

    await exchangeMessagesBetweenAandB([join1, join2], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    for (const channelId of [channelId1, channelId2]) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }
  });
});

async function proposeMultipleChannelsToEachother(
  params: CreateChannelParams,
  N = 2 // Total number of channels = 2 * N
): Promise<{aToJoin: Bytes32[]; bToJoin: Bytes32[]}> {
  const aToJoin = [];
  const bToJoin = [];
  for (let i = 0; i < N; i++) {
    const createA = await a.createChannel(params);
    await b.pushMessage(getPayloadFor(participantB.participantId, createA.outbox));
    const createB = await b.createChannel(params);
    await a.pushMessage(getPayloadFor(participantA.participantId, createB.outbox));
    aToJoin.push(createB.channelResults[0].channelId);
    bToJoin.push(createA.channelResults[0].channelId);
  }
  return {aToJoin, bToJoin};
}

describe('Funding multiple channels concurrently (two sides)', () => {
  afterEach(async () => {
    await a.dbAdmin().truncateDB(['channels', 'ledger_requests']);
    await b.dbAdmin().truncateDB(['channels', 'ledger_requests']);
  });

  it('can fund 2 channels by ledger each proposed by the other', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const {
      bToJoin: [channelId1],
      aToJoin: [channelId2],
    } = await proposeMultipleChannelsToEachother(params, 1);

    const {outbox: joinB} = await b.joinChannel({channelId: channelId1});
    const {outbox: joinA} = await a.joinChannel({channelId: channelId2});

    await exchangeMessagesBetweenAandB([joinB], [joinA]);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    for (const channelId of [channelId1, channelId2]) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }
  });

  it('can fund 4 channels by ledger, 2 created concurrently at a time', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const {
      channelResults: [{channelId: channelId1}],
      outbox: outboxA1,
    } = await a.createChannel(params);

    const {
      channelResults: [{channelId: channelId2}],
      outbox: outboxA2,
    } = await a.createChannel(params);

    await b.pushMessage(getPayloadFor(participantB.participantId, outboxA1));
    await b.pushMessage(getPayloadFor(participantB.participantId, outboxA2));

    const {
      channelResults: [{channelId: channelId3}],
      outbox: outboxB3,
    } = await b.createChannel(params);

    const {
      channelResults: [{channelId: channelId4}],
      outbox: outboxB4,
    } = await b.createChannel(params);

    await a.pushMessage(getPayloadFor(participantA.participantId, outboxB3));
    await a.pushMessage(getPayloadFor(participantA.participantId, outboxB4));

    const {outbox: joinB1} = await b.joinChannel({channelId: channelId1});
    const {outbox: joinB2} = await b.joinChannel({channelId: channelId2});
    const {outbox: joinA3} = await a.joinChannel({channelId: channelId3});
    const {outbox: joinA4} = await a.joinChannel({channelId: channelId4});

    await exchangeMessagesBetweenAandB([joinB1, joinB2], [joinA3, joinA4]);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    for (const channelId of [channelId1, channelId2, channelId3, channelId4]) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }
  });

  it('can fund 4 channels by ledger, 1 created at a time, using joinChannel', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const {aToJoin, bToJoin} = await proposeMultipleChannelsToEachother(params);

    const joinB1 = await b.joinChannel({channelId: bToJoin[0]});
    const joinA2 = await a.joinChannel({channelId: aToJoin[0]});
    const joinB3 = await b.joinChannel({channelId: bToJoin[1]});
    const joinA4 = await a.joinChannel({channelId: aToJoin[1]});

    const messagesAwillSendToB = [joinA2.outbox, joinA4.outbox];
    const messagesBwillSendToA = [joinB1.outbox, joinB3.outbox];

    await exchangeMessagesBetweenAandB(messagesBwillSendToA, messagesAwillSendToB);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    const channelIds = [...bToJoin, ...aToJoin];

    for (const channelId of channelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(6),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(6),
    });
  });

  it('can fund 4 channels by ledger, 1 created at a time, using joinChannels', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1, ledgerChannelId);

    const {aToJoin, bToJoin} = await proposeMultipleChannelsToEachother(params);

    const joinB = await b.joinChannels(bToJoin);
    const joinA = await a.joinChannels(aToJoin);

    const messagesAwillSendToB = [joinA.outbox];
    const messagesBwillSendToA = [joinB.outbox];

    await exchangeMessagesBetweenAandB(messagesBwillSendToA, messagesAwillSendToB);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    const channelIds = [...bToJoin, ...aToJoin];

    for (const channelId of channelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(allocationItems).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }

    expect(allocationItems).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(6),
    });

    expect(allocationItems).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(6),
    });
  });
});
