import {makeAddress, State} from '@statechannels/wallet-core';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/src/config';

import {DBAdmin} from '../../db-admin/db-admin';
import {defaultTestConfig} from '../..';
import {createLogger} from '../../logger';
import {DBDefundChannelObjective, ObjectiveModel} from '../../models/objective';
import {Store} from '../../wallet/store';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {channel} from '../../models/__test__/fixtures/channel';
import {Channel} from '../../models/channel';
import {MockChainService} from '../../chain-service';
import {WalletResponse} from '../../wallet/wallet-response';
import {ChannelDefunder} from '../defund-channel';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {stateSignedBy, stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import {alice, bob} from '../../wallet/__test__/fixtures/signing-wallets';
import {Funding} from '../../models/funding';

const logger = createLogger(defaultTestConfig());
const timingMetrics = false;

let store: Store;

beforeEach(async () => {
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );

  await DBAdmin.truncateDataBaseFromKnex(knex);
  await seedAlicesSigningWallet(knex);
});

afterEach(async () => {
  await DBAdmin.truncateDataBaseFromKnex(knex);
});

describe('when there is no challenge or finalized channel', () => {
  it('should do nothing', async () => {
    const chainService = new MockChainService();
    const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

    // Create the channel in the database
    const c = channel();
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    // Set the objective in the database
    const objective = await createPendingObjective(c.channelId);
    await knex.transaction(tx => store.ensureObjective(objective, tx));

    const pushSpy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');
    const withdrawSpy = jest.spyOn(chainService, 'concludeAndWithdraw');

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    expect(pushSpy).not.toHaveBeenCalled();
    expect(withdrawSpy).not.toHaveBeenCalled();
  });
});

describe('when there is an active challenge', () => {
  it('should submit a conclude transaction if there is a conclusion proof', async () => {
    const chainService = new MockChainService();
    const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

    // Set up a channel with a conclusion proof
    const c = channel({
      channelNonce: 1,
      vars: [stateWithHashSignedBy([alice(), bob()])({isFinal: true})],
    });
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    await setChallengeStatus('active', c);

    // Store objective
    const objective = createPendingObjective(c.channelId);
    await knex.transaction(tx => ObjectiveModel.insert(objective, tx));
    // Setup spies
    const concludeSpy = jest.spyOn(chainService, 'concludeAndWithdraw');

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    const reloadedObjective = await store.getObjective(objective.objectiveId);

    expect(reloadedObjective.status).toEqual('succeeded');
    expect(concludeSpy).toHaveBeenCalled();
  });

  it('should do nothing if there is no conclusion proof', async () => {
    const chainService = new MockChainService();
    const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

    // Setup a channel with no conclusion proof
    const c = channel();
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    await setChallengeStatus('active', c);

    // Store the objective
    const objective = createPendingObjective(c.channelId);
    await knex.transaction(tx => store.ensureObjective(objective, tx));

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    const reloadedObjective = await store.getObjective(objective.objectiveId);
    expect(reloadedObjective.status).toEqual('pending');
  });
});

describe('when the channel is finalized on chain', () => {
  it('should call pushOutcome if the outcome has not been pushed', async () => {
    const chainService = new MockChainService();
    const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

    // Create the channel in the database
    const c = channel({
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    });
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    // If there is a funding entry that means the outcome has not been pushed
    await Funding.updateFunding(knex, c.channelId, '0x05', makeAddress(c.assetHolderAddress));

    const challengeState = stateSignedBy([alice()])();
    await setChallengeStatus('finalized', c, challengeState);

    // Set the objective in the database
    const objective = await createPendingObjective(c.channelId);
    await knex.transaction(tx => store.ensureObjective(objective, tx));

    const pushSpy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');

    // Crank the protocol
    await channelDefunder.crank(objective, WalletResponse.initialize());

    // Check the results
    expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining(challengeState), c.myAddress);
    const reloadedObjective = await store.getObjective(objective.objectiveId);
    expect(reloadedObjective.status).toEqual('succeeded');
  });

  it('does nothing if the outcome has already been pushed', async () => {
    const chainService = new MockChainService();
    const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

    // Create the channel in the database
    const c = channel({
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
    });
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    // Set a finalized channel with a final state
    await setChallengeStatus('finalized', c);

    // Store the objective
    const obj = createPendingObjective(c.channelId);
    await knex.transaction(tx => store.ensureObjective(obj, tx));

    const pushSpy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');
    const withdrawSpy = jest.spyOn(chainService, 'concludeAndWithdraw');

    // Crank the protocol
    await channelDefunder.crank(obj, WalletResponse.initialize());

    // Check the results
    expect(withdrawSpy).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

it('should fail the objective when the channel does not exist', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

  // Create an objective for a channel that does exist in the database
  const objective = createPendingObjective(channel().channelId);
  await knex.transaction(tx => ObjectiveModel.insert(objective, tx));

  // Crank the protocol
  await channelDefunder.crank(objective, WalletResponse.initialize());
  // Check the results
  const reloadedObjective = await store.getObjective(objective.objectiveId);
  expect(reloadedObjective.status).toEqual('failed');
});

it('should fail when using non-direct funding', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

  // Create a channel with fake funding strategy
  const c = channel({fundingStrategy: 'Fake'});
  await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

  // Store the objective
  const obj = createPendingObjective(c.channelId);
  await knex.transaction(tx => store.ensureObjective(obj, tx));

  // Crank the protocol
  await channelDefunder.crank(obj, WalletResponse.initialize());

  // Check the results
  const reloadedObjective = await store.getObjective(obj.objectiveId);
  expect(reloadedObjective.status).toEqual('failed');
});

// Helpers
async function setChallengeStatus(
  status: 'finalized' | 'active',
  channel: Channel,
  state?: Partial<State>
): Promise<void> {
  await AdjudicatorStatusModel.insertAdjudicatorStatus(knex, channel.channelId, 100, [
    stateSignedBy([alice()])(state),
  ]);
  if (status === 'finalized') {
    await AdjudicatorStatusModel.setFinalized(knex, channel.channelId, 22, 200);
  }
}

function createPendingObjective(channelId: string): DBDefundChannelObjective {
  return {
    type: 'DefundChannel',
    status: 'pending',
    objectiveId: ['DefundChannel', channelId].join('-'),
    data: {targetChannelId: channelId},
  };
}
