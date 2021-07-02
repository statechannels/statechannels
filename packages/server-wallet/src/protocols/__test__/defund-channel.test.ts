import {DefundChannel, makeAddress, State} from '@statechannels/wallet-core';

import {defaultTestWalletConfig} from '../..';
import {createLogger} from '../../logger';
import {WalletObjective, ObjectiveModel} from '../../models/objective';
import {Store} from '../../engine/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {EngineResponse} from '../../engine/engine-response';
import {ChannelDefunder} from '../defund-channel';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {stateSignedBy} from '../../engine/__test__/fixtures/states';
import {alice} from '../../engine/__test__/fixtures/signing-wallets';
import {Funding} from '../../models/funding';
import {TestChannel} from '../../engine/__test__/fixtures/test-channel';

const logger = createLogger(defaultTestWalletConfig());
const timingMetrics = false;

let store: Store;

let channelDefunder: ChannelDefunder;

const FINAL = 10; // this will be A's state to sign
const testChan = TestChannel.create({aBal: 5, bBal: 5});
const testChan2 = TestChannel.create({aBal: 5, bBal: 5, finalFrom: FINAL});

let objective: WalletObjective<DefundChannel>;
let objective2: WalletObjective<DefundChannel>;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestWalletConfig().metricsConfiguration.timingMetrics,
    defaultTestWalletConfig().skipEvmValidation,
    '0'
  );

  await seedAlicesSigningWallet(knex);

  channelDefunder = ChannelDefunder.create(store, logger, timingMetrics);

  // Create the channel in the database
  await testChan.insertInto(store, {
    participant: 0,
    states: [0, 1],
  });

  await testChan2.insertInto(store, {
    participant: 0,
    states: [FINAL, FINAL + 1],
  });

  objective = await ObjectiveModel.insert(
    {
      type: 'DefundChannel',
      participants: [],
      data: {targetChannelId: testChan.channelId},
    },

    knex
  );

  objective2 = await ObjectiveModel.insert(
    {
      type: 'DefundChannel',
      participants: [],
      data: {targetChannelId: testChan2.channelId},
    },

    knex
  );
});

describe('when there is no challenge or finalized channel', () => {
  it('should do nothing', async () => {
    const response = new EngineResponse();
    // Crank the protocol
    await crankChannelDefunder(objective, response);

    // Check the results
    expect(response.chainRequests).toHaveLength(0);
  });
});

describe('when there is an active challenge', () => {
  it('should submit a conclude transaction if there is a conclusion proof', async () => {
    const response = new EngineResponse();
    await setAdjudicatorStatus('active', testChan2.channelId);
    // Crank the protocol
    await crankChannelDefunder(objective2, response);

    // Check the results
    const reloadedObjective = await store.getObjective(objective2.objectiveId);

    expect(reloadedObjective.status).toEqual('succeeded');
    expect(response.chainRequests[0]).toMatchObject({type: 'ConcludeAndWithdraw'});
  });

  it('should do nothing if there is no conclusion proof', async () => {
    await setAdjudicatorStatus('active', testChan.channelId);

    // Crank the protocol
    await crankChannelDefunder(objective, EngineResponse.initialize());

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
      makeAddress(testChan.asset)
    );

    const challengeState = stateSignedBy([alice()])();
    await setAdjudicatorStatus('finalized', testChan.channelId, challengeState);
    const response = new EngineResponse();
    // Crank the protocol
    await crankChannelDefunder(objective, response);

    // Check the results
    expect(response.chainRequests[0]).toMatchObject({
      type: 'PushOutcomeAndWithdraw',
      state: expect.objectContaining(challengeState),
      challengerAddress: testChan.participantA.signingAddress,
    });
    const reloadedObjective = await store.getObjective(objective.objectiveId);
    expect(reloadedObjective.status).toEqual('succeeded');
  });

  it('does nothing if the outcome has already been pushed', async () => {
    // Set a finalized channel with a final state
    await setAdjudicatorStatus('finalized', testChan.channelId);

    const response = new EngineResponse();
    // Crank the protocol
    await crankChannelDefunder(objective, response);

    expect(response.chainRequests).toHaveLength(0);
  });
});

it('should fail when using non-direct funding', async () => {
  // Create a channel with fake funding strategy
  await Channel.query(knex).where({channelId: testChan.channelId}).patch({fundingStrategy: 'Fake'});

  // Crank the protocol
  await crankChannelDefunder(objective, new EngineResponse());

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
    await AdjudicatorStatusModel.setFinalized(knex, channelId, 22, 200, 100);
  }
}

async function crankChannelDefunder(
  objective: WalletObjective<DefundChannel>,
  response: EngineResponse
) {
  return store.transaction(async tx => {
    return channelDefunder.crank(objective, response, tx);
  });
}
