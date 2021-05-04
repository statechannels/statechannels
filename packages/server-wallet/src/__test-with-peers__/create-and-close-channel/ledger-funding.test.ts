import {CreateChannelParams} from '@statechannels/client-api-schema';
import {BN, makeAddress, makeDestination} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {Outgoing} from '../..';
import {Bytes32} from '../../type-aliases';
import {
  getChannelResultFor,
  getPayloadFor,
  interParticipantChannelResultsAreEqual,
  ONE_DAY,
} from '../../__test__/test-helpers';
import {DBAdmin} from '../../db-admin/db-admin';
import {
  setupPeerEngines,
  teardownPeerSetup,
  aEngineConfig,
  bEngineConfig,
  PeerSetup,
} from '../../../jest/with-peers-setup-teardown';
// TODO: this is temporary. This test file is refactored in
// https://github.com/statechannels/statechannels/pull/3287
// async function crashAndRestart(engine: Engine): Promise<Engine> {
//   const config = engine.engineConfig;
//   await engine.destroy();
//   return Engine.create(config); // Wallet that will "restart"
// }
const ETH_ASSET_HOLDER_ADDRESS = makeAddress(ethers.constants.AddressZero);

const tablesUsingLedgerChannels = [
  'channels',
  'ledger_requests',
  'objectives_channels',
  'objectives',
];

jest.setTimeout(10_000);

let peerSetup: PeerSetup;
beforeAll(async () => {
  peerSetup = await setupPeerEngines();
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});
/**
 * Create a directly funded channel that will be used as the ledger channel.
 *
 * Note that this is just a simplification of the direct-funding test.
 */
const createLedgerChannel = async (
  peerSetup: PeerSetup,
  aDeposit: number,
  bDeposit: number
): Promise<string> => {
  const {participantA, participantB, peerEngines} = peerSetup;
  const aDepositAmtETH = BN.from(aDeposit);
  const bDepositAmtETH = BN.from(bDeposit);
  const ledgerChannelArgs = {
    challengeDuration: ONE_DAY,
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
        assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      },
    ],
  };
  const resultA0 = await peerEngines.a.createLedgerChannel(ledgerChannelArgs);
  const channelId = resultA0.channelResult.channelId;
  await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

  const resultB1 = await peerEngines.b.joinChannel({channelId});
  await peerEngines.a.pushMessage(getPayloadFor(participantA.participantId, resultB1.outbox));
  const fundingPostADeposit = {
    channelId,
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    amount: aDepositAmtETH,
  };
  await peerEngines.a.holdingUpdated(fundingPostADeposit);
  await peerEngines.b.holdingUpdated(fundingPostADeposit);
  const fundingPostBDeposit = {
    channelId,
    assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    amount: BN.add(aDepositAmtETH, bDepositAmtETH),
  };
  const resultA2 = await peerEngines.a.holdingUpdated(fundingPostBDeposit);
  const resultB3 = await peerEngines.b.holdingUpdated(fundingPostBDeposit);
  await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, resultA2.outbox));
  await peerEngines.a.pushMessage(getPayloadFor(participantA.participantId, resultB3.outbox));

  // TODO: Re-enable this?
  // both wallets crash
  // peerEngines.a = await crashAndRestart(peerEngines.a);
  // peerEngines.b = await crashAndRestart(peerEngines.b);

  return channelId;
};

const testCreateChannelParams = (
  peerSetup: PeerSetup,
  aAllocation: number,
  bAllocation: number,
  ledgerChannelId: string
): CreateChannelParams => {
  const {participantA, participantB} = peerSetup;
  return {
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
        assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS, // must be even length
      },
    ],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00', // must be even length
    fundingStrategy: 'Ledger',
    fundingLedgerChannelId: ledgerChannelId,
    challengeDuration: ONE_DAY,
  };
};

async function exchangeMessagesBetweenAandB(
  peerSetup: PeerSetup,
  bToA: Outgoing[][],
  aToB: Outgoing[][]
) {
  const {participantA, participantB, peerEngines} = peerSetup;
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
      (await peerEngines.a.pushMessage(
        getPayloadFor(participantA.participantId, nextMessageFromB)
      ));

    const newFromB =
      nextMessageFromA &&
      (await peerEngines.b.pushMessage(
        getPayloadFor(participantB.participantId, nextMessageFromA)
      ));

    newFromB?.outbox.length && bToA.push(newFromB.outbox);
    newFromA?.outbox.length && aToB.push(newFromA.outbox);
  }
}

describe('Funding a single channel with 100% of available ledger funds', () => {
  let ledgerChannelId: Bytes32;
  let appChannelId: Bytes32;

  afterAll(async () => {
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it('can fund and close channel by ledger between two engines ', async () => {
    const {participantA, participantB, peerEngines} = peerSetup;
    ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 10, 10, ledgerChannelId);

    const {
      channelResult: {channelId},
      outbox,
    } = await peerEngines.a.createChannel(params);

    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, outbox));

    const {outbox: join} = await peerEngines.b.joinChannel({channelId});

    await exchangeMessagesBetweenAandB(peerSetup, [join], []);
    // so the problem is that we don't end up ledger funded here

    const {channelResults} = await peerEngines.a.getChannels();

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);

    expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
      turnNum: 3,
      status: 'running',
    });

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);
    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(allocationItems).toContainAllocationItem({
      destination: channelId,
      amount: BN.from(20),
    });

    appChannelId = channelId;

    const {outbox: close} = await peerEngines.a.closeChannel({channelId: appChannelId});

    await exchangeMessagesBetweenAandB(peerSetup, [], [close]);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults: channelResults2} = await peerEngines.a.getChannels();

    const ledger2 = getChannelResultFor(ledgerChannelId, channelResults2);

    const {
      allocations: [{allocationItems: allocationItems2}],
    } = ledger2;

    expect(getChannelResultFor(appChannelId, channelResults2)).toMatchObject({
      turnNum: 4,
      status: 'closed',
    });

    expect(allocationItems2).toContainAllocationItem({
      destination: participantA.destination,
      amount: BN.from(10),
    });

    expect(allocationItems2).toContainAllocationItem({
      destination: participantB.destination,
      amount: BN.from(10),
    });
  });
});

describe('Funding a single channel with 50% of ledger funds', () => {
  let ledgerChannelId: Bytes32;
  let appChannelId: Bytes32;

  // afterAll(async () => {
  //   await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
  //   await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  // });

  it('can fund a channel by ledger between two engines ', async () => {
    const {peerEngines, participantA, participantB} = peerSetup;
    ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 5, 5, ledgerChannelId);

    const {
      channelResult: {channelId},
      outbox,
    } = await peerEngines.a.createChannel(params);

    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, outbox));

    const {outbox: join} = await peerEngines.b.joinChannel({channelId});

    await exchangeMessagesBetweenAandB(peerSetup, [join], []);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);

    const {channelResults} = await peerEngines.a.getChannels();
    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

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
    const {peerEngines, participantA, participantB} = peerSetup;
    const {outbox: close} = await peerEngines.a.closeChannel({channelId: appChannelId});

    await exchangeMessagesBetweenAandB(peerSetup, [], [close]);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

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

describe('Closing a ledger channel and preventing it from being used again', () => {
  afterAll(async () => {
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it('can close a ledger channel and fail to fund a new channel ', async () => {
    const {peerEngines, participantB} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const {outbox} = await peerEngines.a.closeChannel({channelId: ledgerChannelId});
    const {outbox: close} = await peerEngines.b.pushMessage(
      getPayloadFor(participantB.participantId, outbox)
    );
    await exchangeMessagesBetweenAandB(peerSetup, [close], []);
    const {channelResult: ledger} = await peerEngines.a.getState({channelId: ledgerChannelId});
    expect(ledger).toMatchObject({
      turnNum: 4,
      status: 'closed',
    });
    const params = testCreateChannelParams(peerSetup, 10, 10, ledgerChannelId);
    await expect(peerEngines.a.createChannel(params)).rejects.toThrow(/closed/);
    await expect(peerEngines.a.createChannels(params, 1)).rejects.toThrow(/closed/);
  });
});

describe('Funding multiple channels synchronously (in bulk)', () => {
  const N = 4;
  let ledgerChannelId: Bytes32;
  let appChannelIds: Bytes32[];

  afterAll(async () => {
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it(`can fund ${N} channels created in bulk by Alice`, async () => {
    const {peerEngines, participantB} = peerSetup;
    ledgerChannelId = await createLedgerChannel(peerSetup, 4, 4);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const resultA = await peerEngines.a.createChannels(params, N);
    const channelIds = resultA.channelResults.map(c => c.channelId);
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, resultA.outbox));
    const resultB = await peerEngines.b.joinChannels(channelIds);

    await exchangeMessagesBetweenAandB(peerSetup, [resultB.outbox], []);

    const {channelResults} = await peerEngines.a.getChannels();

    await expect(peerEngines.b.getChannels()).resolves.toEqual({
      channelResults,
      outbox: [],
      newObjectives: [],
      messagesByObjective: {},
    });

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(allocationItems).toHaveLength(N + 2); // we always keep participants in outcome, even if empty

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
    const {peerEngines, participantA, participantB} = peerSetup;
    // ⚠️ This results in several messages back and forth
    await exchangeMessagesBetweenAandB(
      peerSetup,
      [],
      await Promise.all(
        appChannelIds.map(async channelId => (await peerEngines.a.closeChannel({channelId})).outbox)
      )
    );

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);

    const {channelResults} = await peerEngines.a.getChannels();

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

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
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it(`can fund ${N * 2} channels created in bulk by Alice`, async () => {
    const {peerEngines, participantB} = peerSetup;
    ledgerChannelId = await createLedgerChannel(peerSetup, N * 2, N * 2);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const createMessageAndJoinBatch = async (): Promise<Bytes32[]> => {
      const {outbox, channelResults} = await peerEngines.a.createChannels(params, N);
      const channelIds = channelResults.map(c => c.channelId);
      await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, outbox));
      const joinResults = await peerEngines.b.joinChannels(channelIds);
      await exchangeMessagesBetweenAandB(peerSetup, [joinResults.outbox], []);
      return channelIds;
    };

    const results = await Promise.all([createMessageAndJoinBatch(), createMessageAndJoinBatch()]);

    const channelIds = results.flat();

    const {channelResults} = await peerEngines.a.getChannels();

    await expect(peerEngines.b.getChannels()).resolves.toEqual({
      channelResults,
      outbox: [],
      newObjectives: [],
      messagesByObjective: {},
    });

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

    expect(ledger.status).toBe('running');

    expect(allocationItems).toHaveLength(N * 2 + 2); // always include participants, even if 0

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
    const {peerEngines, participantA, participantB} = peerSetup;
    // ⚠️ This results in several messages back and forth
    await exchangeMessagesBetweenAandB(
      peerSetup,
      [],
      await Promise.all(
        appChannelIds.map(async channelId => (await peerEngines.a.closeChannel({channelId})).outbox)
      )
    );

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

    const ledger = getChannelResultFor(ledgerChannelId, channelResults);

    const {
      allocations: [{allocationItems}],
    } = ledger;

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
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it(`can fund 4 channels created in bulk by Alice, rejecting 2 with no funds`, async () => {
    const {peerEngines, participantB} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 2, 2);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const resultA0 = await peerEngines.a.createChannels(params, 4); // 2 channels will be unfunded
    const channelIds = resultA0.channelResults.map(c => c.channelId);
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));
    const resultB1 = await peerEngines.b.joinChannels(channelIds);

    await exchangeMessagesBetweenAandB(peerSetup, [resultB1.outbox], []);

    const {channelResults} = await peerEngines.a.getChannels();

    await expect(peerEngines.b.getChannels()).resolves.toEqual({
      channelResults,
      outbox: [],
      newObjectives: [],
      messagesByObjective: {},
    });

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    expect(allocationItems).toHaveLength(2 + 2); // always keep participants in outcome, even if 0

    const unfundedChannels = channelResults.filter(c => c.status === 'opening');

    expect(unfundedChannels).toMatchObject([
      {
        turnNum: 0,
        status: 'opening',
      },
      {
        turnNum: 0,
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

  it(`can simply not fund a single channel requesting way too much`, async () => {
    const LEDGER_HAS = 2;
    const APP_WANTS = 10000000; // > 2

    const ledgerChannelId = await createLedgerChannel(peerSetup, LEDGER_HAS, LEDGER_HAS);
    const params = testCreateChannelParams(peerSetup, APP_WANTS, APP_WANTS, ledgerChannelId);

    const {peerEngines, participantB} = peerSetup;
    const resultA = await peerEngines.a.createChannel(params);
    const {channelId} = resultA.channelResult;
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, resultA.outbox));
    const resultB = await peerEngines.b.joinChannel({channelId});

    await exchangeMessagesBetweenAandB(peerSetup, [resultB.outbox], []);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

    const {
      allocations: [{allocationItems}],
    } = getChannelResultFor(ledgerChannelId, channelResults);

    expect(allocationItems).toHaveLength(2);

    const unfundedChannels = channelResults.filter(c => c.channelId === channelId);

    expect(unfundedChannels).toMatchObject([{turnNum: 0, status: 'opening'}]);
    expect(allocationItems).not.toContainAllocationItem({
      destination: makeDestination(channelId),
      amount: BN.from(2),
    });
  });
});

describe('Funding multiple channels concurrently (one sided)', () => {
  afterAll(async () => {
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it('can fund 2 channels by ledger both proposed by the same wallet', async () => {
    const {peerEngines, participantB} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const create1 = await peerEngines.a.createChannel(params);
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, create1.outbox));

    const create2 = await peerEngines.a.createChannel(params);
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, create2.outbox));

    const channelId1 = create1.channelResult.channelId;
    const channelId2 = create2.channelResult.channelId;

    const {outbox: join1} = await peerEngines.b.joinChannel({channelId: channelId1});
    const {outbox: join2} = await peerEngines.b.joinChannel({channelId: channelId2});

    await exchangeMessagesBetweenAandB(peerSetup, [join1, join2], []);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

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
  peerSetup: PeerSetup,
  params: CreateChannelParams,
  N = 2 // Total number of channels = 2 * N
): Promise<{aToJoin: Bytes32[]; bToJoin: Bytes32[]}> {
  const aToJoin = [];
  const bToJoin = [];
  for (let i = 0; i < N; i++) {
    const {peerEngines, participantA, participantB} = peerSetup;
    const createA = await peerEngines.a.createChannel(params);
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, createA.outbox));
    const createB = await peerEngines.b.createChannel(params);
    await peerEngines.a.pushMessage(getPayloadFor(participantA.participantId, createB.outbox));
    aToJoin.push(createB.channelResult.channelId);
    bToJoin.push(createA.channelResult.channelId);
  }
  return {aToJoin, bToJoin};
}

describe('Funding multiple channels concurrently (two sides)', () => {
  afterEach(async () => {
    await DBAdmin.truncateDatabase(aEngineConfig, tablesUsingLedgerChannels);
    await DBAdmin.truncateDatabase(bEngineConfig, tablesUsingLedgerChannels);
  });

  it('can fund 2 channels by ledger each proposed by the other', async () => {
    const {peerEngines} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const {
      bToJoin: [channelId1],
      aToJoin: [channelId2],
    } = await proposeMultipleChannelsToEachother(peerSetup, params, 1);

    const {outbox: joinB} = await peerEngines.b.joinChannel({channelId: channelId1});
    const {outbox: joinA} = await peerEngines.a.joinChannel({channelId: channelId2});

    await exchangeMessagesBetweenAandB(peerSetup, [joinB], [joinA]);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

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
    const {peerEngines, participantA, participantB} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const {
      channelResult: {channelId: channelId1},
      outbox: outboxA1,
    } = await peerEngines.a.createChannel(params);

    const {
      channelResult: {channelId: channelId2},
      outbox: outboxA2,
    } = await peerEngines.a.createChannel(params);

    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, outboxA1));
    await peerEngines.b.pushMessage(getPayloadFor(participantB.participantId, outboxA2));

    const {
      channelResult: {channelId: channelId3},
      outbox: outboxB3,
    } = await peerEngines.b.createChannel(params);

    const {
      channelResult: {channelId: channelId4},
      outbox: outboxB4,
    } = await peerEngines.b.createChannel(params);

    await peerEngines.a.pushMessage(getPayloadFor(participantA.participantId, outboxB3));
    await peerEngines.a.pushMessage(getPayloadFor(participantA.participantId, outboxB4));

    const {outbox: joinB1} = await peerEngines.b.joinChannel({channelId: channelId1});
    const {outbox: joinB2} = await peerEngines.b.joinChannel({channelId: channelId2});
    const {outbox: joinA3} = await peerEngines.a.joinChannel({channelId: channelId3});
    const {outbox: joinA4} = await peerEngines.a.joinChannel({channelId: channelId4});

    await exchangeMessagesBetweenAandB(peerSetup, [joinB1, joinB2], [joinA3, joinA4]);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

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
    const {peerEngines, participantA, participantB} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const {aToJoin, bToJoin} = await proposeMultipleChannelsToEachother(peerSetup, params);

    const joinB1 = await peerEngines.b.joinChannel({channelId: bToJoin[0]});
    const joinA2 = await peerEngines.a.joinChannel({channelId: aToJoin[0]});
    const joinB3 = await peerEngines.b.joinChannel({channelId: bToJoin[1]});
    const joinA4 = await peerEngines.a.joinChannel({channelId: aToJoin[1]});

    const messagesAwillSendToB = [joinA2.outbox, joinA4.outbox];
    const messagesBwillSendToA = [joinB1.outbox, joinB3.outbox];

    await exchangeMessagesBetweenAandB(peerSetup, messagesBwillSendToA, messagesAwillSendToB);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

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
    const {peerEngines, participantA, participantB} = peerSetup;
    const ledgerChannelId = await createLedgerChannel(peerSetup, 10, 10);
    const params = testCreateChannelParams(peerSetup, 1, 1, ledgerChannelId);

    const {aToJoin, bToJoin} = await proposeMultipleChannelsToEachother(peerSetup, params);

    const joinB = await peerEngines.b.joinChannels(bToJoin);
    const joinA = await peerEngines.a.joinChannels(aToJoin);

    const messagesAwillSendToB = [joinA.outbox];
    const messagesBwillSendToA = [joinB.outbox];

    await exchangeMessagesBetweenAandB(peerSetup, messagesBwillSendToA, messagesAwillSendToB);

    await interParticipantChannelResultsAreEqual(peerEngines.a, peerEngines.b);
    const {channelResults} = await peerEngines.a.getChannels();

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
