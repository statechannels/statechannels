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
import {ChallengeStatus} from '../../models/challenge-status';
import {stateVars} from '../../wallet/__test__/fixtures/state-vars';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import {alice, bob} from '../../wallet/__test__/fixtures/signing-wallets';

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

  await store.dbAdmin().truncateDB();
  await seedAlicesSigningWallet(knex);
});

test('when the channel does not exist it should fail the objective', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);
  const c = channel();

  const obj: DBDefundChannelObjective = {
    type: 'DefundChannel',
    status: 'pending',
    objectiveId: ['DefundChannel', c.channelId].join('-'),
    data: {targetChannelId: c.channelId},
  };

  await knex.transaction(tx => ObjectiveModel.insert(obj, tx));
  const response = WalletResponse.initialize();

  await channelDefunder.crank(obj, response);

  const reloadedObjective = await store.getObjective(obj.objectiveId);
  expect(reloadedObjective.status).toEqual('failed');
});

test('when using non-direct funding it fails', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

  const c = channel({fundingStrategy: 'Fake'});

  await Channel.query(knex)
    .withGraphFetched('signingWallet')
    .insert(c);

  const obj = createPendingObjective(c.channelId);
  await knex.transaction(tx => store.ensureObjective(obj, tx));
  const response = WalletResponse.initialize();

  await channelDefunder.crank(obj, response);

  const reloadedObjective = await store.getObjective(obj.objectiveId);
  expect(reloadedObjective.status).toEqual('failed');
});

test('when there is an active challenge it should do nothing', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);

  const c = channel();
  const challengeState = {
    ...c.channelConstants,
    ...stateVars(),
  };
  await Channel.query(knex)
    .withGraphFetched('signingWallet')
    .insert(c);
  await ChallengeStatus.insertChallengeStatus(knex, c.channelId, 100, challengeState);

  const obj = createPendingObjective(c.channelId);
  await knex.transaction(tx => store.ensureObjective(obj, tx));
  const response = WalletResponse.initialize();

  await channelDefunder.crank(obj, response);

  const reloadedObjective = await store.getObjective(obj.objectiveId);
  expect(reloadedObjective.status).toEqual('pending');
});

test('when the channel is not finalized it defunds the channel by calling pushOutcomeAndWithdraw', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);
  const c = channel();
  const challengeState = {
    ...c.channelConstants,
    ...stateVars(),
  };
  await Channel.query(knex)
    .withGraphFetched('signingWallet')
    .insert(c);
  await ChallengeStatus.insertChallengeStatus(knex, c.channelId, 100, challengeState);
  await ChallengeStatus.setFinalized(knex, c.channelId, 200);
  const obj = createPendingObjective(c.channelId);

  await knex.transaction(tx => store.ensureObjective(obj, tx));
  const response = WalletResponse.initialize();
  const pushSpy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');

  await channelDefunder.crank(obj, response);

  expect(pushSpy).toHaveBeenCalledWith(challengeState, c.myAddress);
  const reloadedObjective = await store.getObjective(obj.objectiveId);
  expect(reloadedObjective.status).toEqual('succeeded');
});

test('when the channel has not been concluded on chain it should call withdrawAndPushOutcome', async () => {
  const chainService = new MockChainService();
  const channelDefunder = ChannelDefunder.create(store, chainService, logger, timingMetrics);
  const c = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({isFinal: true})],
  });

  await Channel.query(knex)
    .withGraphFetched('signingWallet')
    .insert(c);

  await ChallengeStatus.setFinalized(knex, c.channelId, 200);
  const obj = createPendingObjective(c.channelId);

  await knex.transaction(tx => store.ensureObjective(obj, tx));
  const response = WalletResponse.initialize();
  const withdrawSpy = jest.spyOn(chainService, 'concludeAndWithdraw');

  await channelDefunder.crank(obj, response);

  expect(withdrawSpy).toHaveBeenCalledWith(c.support);

  const reloadedObjective = await store.getObjective(obj.objectiveId);
  expect(reloadedObjective.status).toEqual('succeeded');
});

afterEach(async () => {
  await store.dbAdmin().truncateDB();
});

function createPendingObjective(channelId: string): DBDefundChannelObjective {
  return {
    type: 'DefundChannel',
    status: 'pending',
    objectiveId: ['DefundChannel', channelId].join('-'),
    data: {targetChannelId: channelId},
  };
}
