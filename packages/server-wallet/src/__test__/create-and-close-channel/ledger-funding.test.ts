import {CreateChannelParams} from '@statechannels/client-api-schema';
import {
  AllocationItem,
  areAllocationItemsEqual,
  BN,
  makeDestination,
  Participant,
} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {Outgoing} from '../..';
import {defaultTestConfig} from '../../config';
import {Bytes32} from '../../type-aliases';
import {Wallet} from '../../wallet';
import {crashAndRestart, getChannelResultFor, getPayloadFor} from '../test-helpers';

const ETH_ASSET_HOLDER_ADDRESS = ethers.constants.AddressZero;

const a = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_A'});
let b = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_B'});

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
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00',
    fundingStrategy: 'Direct' as const,
  };
  const resultA0 = await a.createChannel(ledgerChannelArgs);
  const channelId = resultA0.channelResults[0].channelId;
  await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

  // B CRASHES
  b = await crashAndRestart(b);

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
  a.dbAdmin().truncateDB(['ledgers']);
  b.dbAdmin().truncateDB(['ledgers']);
});

expect.extend({
  toContainAllocationItem(received: AllocationItem[], argument: AllocationItem) {
    const pass = received.some(areAllocationItemsEqual.bind(null, argument));
    if (pass) {
      return {
        pass: true,
        message: () =>
          `expected ${JSON.stringify(received, null, 2)} to not contain ${JSON.stringify(
            argument,
            null,
            2
          )}`,
      };
    } else {
      return {
        pass: false,
        message: () =>
          `expected ${JSON.stringify(received, null, 2)} to contain ${JSON.stringify(
            argument,
            null,
            2
          )}`,
      };
    }
  },
});

describe('Funding a single channel', () => {
  it('can fund a channel by ledger between two wallets ', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1);

    const {
      channelResults: [{channelId}],
      outbox: outbox,
    } = await a.createChannel(params);

    await b.pushMessage(getPayloadFor(participantB.participantId, outbox));

    const {outbox: join} = await b.joinChannel({channelId});

    await exchangeMessagesBetweenAandB([join], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
      turnNum: 3,
      status: 'running',
    });

    expect(allocationItems).toContainAllocationItem({
      destination: channelId,
      amount: BN.from(2),
    });
  });
});

const testCreateChannelParams = (
  aAllocation: number,
  bAllocation: number
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
});

async function exchangeMessagesBetweenAandB(bToA: Outgoing[][], aToB: Outgoing[][]) {
  while (aToB.length + bToA.length > 0) {
    const nextMessageFromB = bToA.shift();
    const nextMessageFromA = aToB.shift();

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

describe('Funding multiple channels syncronously (in bulk)', () => {
  const N = 10; // beforeEach creates a ledger channel with 10 ETH each

  it(`can fund ${N} channels created in bulk by Alice`, async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1);

    const resultA0 = await a.createChannels(params, N);
    const channelIds = resultA0.channelResults.map(c => c.channelId);
    await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));
    const resultB1 = await b.joinChannels(channelIds);

    await exchangeMessagesBetweenAandB([resultB1.outbox], []);

    const {channelResults} = await a.getChannels();

    await expect(b.getChannels()).resolves.toEqual({channelResults, outbox: []});

    const {
      allocations: [{allocationItems: ledgerAllocationsA}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    for (const channelId of channelIds) {
      expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
        turnNum: 3,
        status: 'running',
      });
      expect(ledgerAllocationsA).toContainAllocationItem({
        destination: channelId,
        amount: BN.from(2),
      });
    }
  });
});

describe('Funding multiple channels concurrently (one sided)', () => {
  it('can fund 2 channels by ledger both proposed by the same wallet', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1);

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
  it('can fund 2 channels by ledger each proposed by the other', async () => {
    const ledgerChannelId = await createLedgerChannel(10, 10);
    const params = testCreateChannelParams(1, 1);

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
    const params = testCreateChannelParams(1, 1);

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
    const params = testCreateChannelParams(1, 1);

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
    const params = testCreateChannelParams(1, 1);

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
