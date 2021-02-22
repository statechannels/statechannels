import {Transaction} from 'objection';

import {defaultTestConfig} from '../..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {MockChainService} from '../../chain-service';
import {DBAdmin} from '../../db-admin/db-admin';
import {createLogger} from '../../logger';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {Channel} from '../../models/channel';
import {Funding} from '../../models/funding';
import {LedgerRequest} from '../../models/ledger-request';
import {
  DBCloseChannelObjective,
  DBDefundChannelObjective,
  ObjectiveModel,
} from '../../models/objective';
import {Store} from '../../wallet/store';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {Defunder, shouldSubmitCollaborativeTx} from '../defunder';

const testChannel = TestChannel.create({
  aBal: 5,
  bBal: 3,
  finalFrom: 4,
});

const testLedgerChannel = TestChannel.create({
  aBal: 5,
  bBal: 3,
  finalFrom: 4,
  fundingStrategy: 'Ledger',
});

let store: Store;

async function ensureCloseObjective(
  channel: TestChannel,
  tx: Transaction,
  participantIndex = 0
): Promise<DBCloseChannelObjective> {
  // add the closeChannel objective and approve
  const o = await ObjectiveModel.insert(
    channel.closeChannelObjective([participantIndex, 1 - participantIndex]),
    true,
    tx
  );
  await store.approveObjective(o.objectiveId, tx);
  return o as DBCloseChannelObjective;
}

async function ensureDefundObjective(
  channel: TestChannel,
  tx: Transaction
): Promise<DBDefundChannelObjective> {
  // add the defundChannel objective and approve
  const o = await ObjectiveModel.insert(channel.defundChannelObjective(), false, tx);
  await store.approveObjective(o.objectiveId, tx);
  return o as DBDefundChannelObjective;
}

function testShouldSubmitCollaborativeTx(channel: Channel, order: number[], outcome: boolean) {
  const objective = ({
    type: 'CloseChannel',
    data: {txSubmitterOrder: order},
  } as unknown) as DBCloseChannelObjective;
  expect(shouldSubmitCollaborativeTx(channel, objective)).toEqual(outcome);
}

beforeEach(async () => {
  await DBAdmin.truncateDataBaseFromKnex(testKnex);

  store = new Store(
    testKnex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
});

describe('Collaborative transaction submitter', () => {
  it('shouldSubmitCollaborativeTx is correct for participant 0', async () => {
    await testChannel.insertInto(store, {
      participant: 0,
      states: [3, 4],
    });
    const channel = await Channel.forId(testChannel.channelId, testKnex);

    testShouldSubmitCollaborativeTx(channel, [0, 1], true);
    testShouldSubmitCollaborativeTx(channel, [1, 0], false);
    testShouldSubmitCollaborativeTx(channel, [], true);

    const objective4 = {
      type: 'DefundChannel',
    } as DBDefundChannelObjective;
    expect(shouldSubmitCollaborativeTx(channel, objective4)).toEqual(true);
  });

  it('shouldSubmitCollaborativeTx is correct for participant 1', async () => {
    await testChannel.insertInto(store, {
      participant: 1,
      states: [3, 4],
    });
    const channel = await Channel.forId(testChannel.channelId, testKnex);

    testShouldSubmitCollaborativeTx(channel, [0, 1], false);
    testShouldSubmitCollaborativeTx(channel, [1, 0], true);
    testShouldSubmitCollaborativeTx(channel, [], true);

    const objective = {
      type: 'DefundChannel',
    } as DBDefundChannelObjective;
    expect(shouldSubmitCollaborativeTx(channel, objective)).toEqual(true);
  });

  it('shouldSubmitCollaborativeTx is correct for participant with no funds', async () => {
    const testChannel2 = TestChannel.create({
      aBal: 0,
      bBal: 3,
      finalFrom: 4,
    });

    await testChannel2.insertInto(store, {
      participant: 0,
      states: [3, 4],
    });
    const channel = await Channel.forId(testChannel2.channelId, testKnex);

    testShouldSubmitCollaborativeTx(channel, [0, 1], false);

    const objective = {
      type: 'DefundChannel',
    } as DBDefundChannelObjective;
    expect(shouldSubmitCollaborativeTx(channel, objective)).toEqual(true);
  });
});

describe('Direct channel defunding', () => {
  it('Channel is defunded via submission of withdrawAndConlcude transaction', async () => {
    // Channel has yet to be concluded
    await testChannel.insertInto(store, {
      participant: 0,
      states: [3, 4],
      funds: 8,
    });
    const chainService = new MockChainService();
    const spy = jest.spyOn(chainService, 'concludeAndWithdraw');
    const logger = createLogger(defaultTestConfig());

    let channel = await Channel.forId(testChannel.channelId, testKnex);
    const defunder = new Defunder(store, chainService, logger);

    await testKnex.transaction(async tx => {
      const objective = await ensureCloseObjective(testChannel, tx, 1);
      // Defunder should take no actions as there is no conclusion proof.
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(spy).not.toHaveBeenCalled();

      // Add a conclusion proof to the store.
      const state = testChannel.wireState(5);
      channel = await store.addSignedState(channel.channelId, state, tx);

      // Defunder should NOT submit a transaction since we are not the transaction submitter.
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(spy).not.toHaveBeenCalled();

      // Defunder should submit a transaction since there is a conclusion proof and we are the transaction submitter.
      objective.data.txSubmitterOrder = [0, 1];
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: true,
        isChannelDefunded: false,
      });
      expect(spy).toHaveBeenCalledWith(channel.support);

      // The channel has NOT been fully defunded.
      // Defunder does not complete
      await Funding.updateFunding(tx, channel.channelId, '0x03', testChannel.assetHolderAddress);
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });

      // The channel has been fully defunded
      // Defunder completes
      await Funding.updateFunding(tx, channel.channelId, '0x00', testChannel.assetHolderAddress);
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: true,
      });
    });
  });

  it('Channel is defunded via pushOutcome transaction', async () => {
    // Channel has yet to be concluded
    await testChannel.insertInto(store, {
      participant: 0,
      states: [3, 4],
      funds: 8,
    });
    const state3 = testChannel.signedStateWithHash(3);
    const state4 = testChannel.signedStateWithHash(4);

    const chainService = new MockChainService();
    const spy = jest.spyOn(chainService, 'pushOutcomeAndWithdraw');
    const logger = createLogger(defaultTestConfig());

    const channel = await Channel.forId(testChannel.channelId, testKnex);
    const defunder = new Defunder(store, chainService, logger);
    await AdjudicatorStatusModel.insertAdjudicatorStatus(testKnex, channel.channelId, 1, [
      state4,
      state3,
    ]);
    await AdjudicatorStatusModel.setFinalized(testKnex, channel.channelId, 1, 1, 1);

    await testKnex.transaction(async tx => {
      const objective = await ensureDefundObjective(testChannel, tx);

      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: true,
        isChannelDefunded: false,
      });
      expect(spy).toHaveBeenCalledWith(state4, channel.myAddress);

      // The channel has been fully defunded
      // Defunder completes
      await Funding.updateFunding(tx, channel.channelId, '0x00', testChannel.assetHolderAddress);
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: true,
      });
    });
  });
});

describe('Ledger funded channel defunding', () => {
  it('Ledger channel is defunded', async () => {
    // Channel has yet to be concluded
    await testLedgerChannel.insertInto(store, {
      participant: 0,
      states: [3, 4],
      funds: 8,
    });

    const chainService = new MockChainService();
    const logger = createLogger(defaultTestConfig());
    const defunder = new Defunder(store, chainService, logger);

    let channel = await Channel.forId(testLedgerChannel.channelId, testKnex);
    await testKnex.transaction(async tx => {
      const objective = await ensureCloseObjective(testLedgerChannel, tx);

      // There is no conclusion proof
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(await store.getLedgerRequest(channel.channelId, 'defund', tx)).toBeUndefined();

      channel = await store.addSignedState(channel.channelId, testLedgerChannel.wireState(5), tx);
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });

      // Defunder should store a ledger defunding request
      expect(await store.getLedgerRequest(channel.channelId, 'defund', tx)).toMatchObject({
        channelToBeFunded: channel.channelId,
        status: 'pending',
        type: 'defund',
      });

      await LedgerRequest.setRequestStatus(channel.channelId, 'defund', 'succeeded', tx);

      // Defunder should is now done
      expect(await defunder.crank(channel, objective, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: true,
      });
    });
  });
});
