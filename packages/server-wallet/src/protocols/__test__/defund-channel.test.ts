import {makeAddress, State} from '@statechannels/wallet-core';

import {defaultTestConfig} from '../..';
import {createLogger} from '../../logger';
import {DBDefundChannelObjective} from '../../models/objective';
import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {
  ChainServiceInterface,
  ErorringMockChainService,
  MockChainService,
} from '../../chain-service';
import {WalletResponse} from '../../wallet/wallet-response';
import {ChannelDefunder} from '../defund-channel';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {stateSignedBy} from '../../wallet/__test__/fixtures/states';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {Funding} from '../../models/funding';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';

const logger = createLogger(defaultTestConfig());
const timingMetrics = false;

let store: Store;
let chainService: ChainServiceInterface;
let channelDefunder: ChannelDefunder;

const FINAL = 10; // this will be A's state to sign
const testChan = TestChannel.create({aBal: 5, bBal: 5});
const testChan2 = TestChannel.create({aBal: 5, bBal: 5, finalFrom: FINAL});

let objective: DBDefundChannelObjective;
let objective2: DBDefundChannelObjective;

let pushSpy: jest.SpyInstance;
let withdrawSpy: jest.SpyInstance;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );

  await seedAlicesSigningWallet(knex);
  chainService = new MockChainService();
  channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

  // Create the channel in the database
  await testChan.insertInto(store, {
    participant: 0,
    states: [0, 1],
  });

  await testChan2.insertInto(store, {
    participant: 0,
    states: [FINAL, FINAL + 1],
  });

  objective = createPendingObjective(testChan.channelId);
  objective2 = createPendingObjective(testChan2.channelId);

  await knex.transaction(tx => store.ensureObjective(objective, tx));
  await knex.transaction(tx => store.ensureObjective(objective2, tx));

  pushSpy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');
  withdrawSpy = jest.spyOn(chainService, 'concludeAndWithdraw');
});

describe('when there is no challenge or finalized channel', () => {
  it('should do nothing', async () => {
    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    expect(pushSpy).not.toHaveBeenCalled();
    expect(withdrawSpy).not.toHaveBeenCalled();
  });
});

describe('when there is an active challenge', () => {
  it('should submit a conclude transaction if there is a conclusion proof', async () => {
    await setAdjudicatorStatus('active', testChan2.channelId);
    // Crank the protocol
    await channelDefunder.crank(objective2, WalletResponse.initialize());

    // Check the results
    const reloadedObjective = await store.getObjective(objective2.objectiveId);

    expect(reloadedObjective.status).toEqual('succeeded');
    expect(withdrawSpy).toHaveBeenCalled();
  });

  it('should do nothing if there is no conclusion proof', async () => {
    await setAdjudicatorStatus('active', testChan.channelId);

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    const reloadedObjective = await store.getObjective(objective.objectiveId);
    expect(reloadedObjective.status).toEqual('pending');
  });
});

describe('when the channel is finalized on chain', () => {
  it('should call pushOutcome if the outcome has not been pushed', async () => {
    // If there is a funding entry that means the outcome has not been pushed
    await Funding.updateFunding(
      knex,
      testChan.channelId,
      '0x05',
      makeAddress(testChan.assetHolderAddress)
    );

    const challengeState = stateSignedBy([alice()])();
    await setAdjudicatorStatus('finalized', testChan.channelId, challengeState);

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining(challengeState),
      testChan.participantA.signingAddress
    );
    const reloadedObjective = await store.getObjective(objective.objectiveId);
    expect(reloadedObjective.status).toEqual('succeeded');
  });

  it('does nothing if the outcome has already been pushed', async () => {
    // Set a finalized channel with a final state
    await setAdjudicatorStatus('finalized', testChan.channelId);

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    expect(withdrawSpy).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('transaction submission error', async () => {
    chainService = new ErorringMockChainService();
    channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

    // If there is a funding entry that means the outcome has not been pushed
    await Funding.updateFunding(
      knex,
      testChan.channelId,
      '0x05',
      makeAddress(testChan.assetHolderAddress)
    );

    const challengeState = stateSignedBy([alice()])();
    await setAdjudicatorStatus('finalized', testChan.channelId, challengeState);

    // Crank the protocol
    await expect(channelDefunder.crank(objective, WalletResponse.initialize())).rejects.toThrow(
      'Failed to submit transaction'
    );

    // Check the results
    const reloadedObjective = await store.getObjective(objective.objectiveId);
    expect(reloadedObjective.status).toEqual('pending');
  });
});

it('should fail when using non-direct funding', async () => {
  // Create a channel with fake funding strategy
  await Channel.query(knex).where({channelId: testChan.channelId}).patch({fundingStrategy: 'Fake'});

  // Crank the protocol
  await channelDefunder.crank(objective, WalletResponse.initialize());

  // Check the results
  const reloadedObjective = await store.getObjective(objective.objectiveId);
  expect(reloadedObjective.status).toEqual('failed');
});

// Helpers
async function setAdjudicatorStatus(
  status: 'finalized' | 'active',
  channelId: string,
  state?: Partial<State>
): Promise<void> {
  await AdjudicatorStatusModel.insertAdjudicatorStatus(knex, channelId, 100, [
    stateSignedBy([alice()])(state),
  ]);
  if (status === 'finalized') {
    await AdjudicatorStatusModel.setFinalized(knex, channelId, 22, 200);
  }
}

function createPendingObjective(channelId: string): DBDefundChannelObjective {
  return {
    type: 'DefundChannel',
    status: 'pending',
    participants: [],
    objectiveId: ['DefundChannel', channelId].join('-'),
    data: {targetChannelId: channelId},
    createdAt: new Date(Date.now()),
    progressLastMadeAt: new Date(Date.now()),
  };
}
