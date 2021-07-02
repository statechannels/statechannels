import {CloseChannel, DefundChannel} from '@statechannels/wallet-core';
import {Transaction} from 'objection';

import {defaultTestWalletConfig} from '../..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {DBAdmin} from '../../db-admin/db-admin';
import {createLogger} from '../../logger';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {Channel} from '../../models/channel';
import {Funding} from '../../models/funding';
import {LedgerRequest} from '../../models/ledger-request';
import {ObjectiveModel, WalletObjective} from '../../models/objective';
import {Store} from '../../engine/store';
import {TestChannel} from '../../engine/__test__/fixtures/test-channel';
import {TestLedgerChannel} from '../../engine/__test__/fixtures/test-ledger-channel';
import {Defunder, shouldSubmitCollaborativeTx} from '../defunder';
import {EngineResponse} from '../../engine/engine-response';

const testChannel = TestChannel.create({
  aBal: 5,
  bBal: 3,
  finalFrom: 4,
});

const ledger = TestLedgerChannel.create({});
const testLedgerFundedChannel = TestChannel.create({
  aBal: 5,
  bBal: 3,
  finalFrom: 4,
  fundingLedgerChannelId: ledger.channelId,
});

let store: Store;

async function ensureCloseObjective(
  channel: TestChannel,
  tx: Transaction,
  participantIndex = 0
): Promise<WalletObjective<CloseChannel>> {
  // add the closeChannel objective and approve
  return ObjectiveModel.insert(
    channel.closeChannelObjective([participantIndex, 1 - participantIndex]),
    tx,
    'approved'
  );
}

async function ensureDefundObjective(
  channel: TestChannel,
  tx: Transaction
): Promise<WalletObjective<DefundChannel>> {
  // add an approved defundChannel objective and approve
  return ObjectiveModel.insert(channel.defundChannelObjective(), tx, 'approved');
}

function testShouldSubmitCollaborativeTx(channel: Channel, order: number[], outcome: boolean) {
  const objective = ({
    type: 'CloseChannel',
    data: {txSubmitterOrder: order},
  } as unknown) as WalletObjective<CloseChannel>;
  expect(shouldSubmitCollaborativeTx(channel, objective)).toEqual(outcome);
}

beforeEach(async () => {
  await DBAdmin.truncateDataBaseFromKnex(testKnex);

  store = new Store(
    testKnex,
    defaultTestWalletConfig().metricsConfiguration.timingMetrics,
    defaultTestWalletConfig().skipEvmValidation,
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
    } as WalletObjective<DefundChannel>;
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
    } as WalletObjective<DefundChannel>;
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
    } as WalletObjective<DefundChannel>;
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

    const response = new EngineResponse();

    const logger = createLogger(defaultTestWalletConfig());

    let channel = await Channel.forId(testChannel.channelId, testKnex);
    const defunder = new Defunder(store, logger);

    await testKnex.transaction(async tx => {
      const objective = await ensureCloseObjective(testChannel, tx, 1);
      // Defunder should take no actions as there is no conclusion proof.
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(response.chainRequests).toHaveLength(0);

      // Add a conclusion proof to the store.
      const state = testChannel.wireState(5);
      channel = await store.addSignedState(channel.channelId, state, tx);

      // Defunder should NOT submit a transaction since we are not the transaction submitter.
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(response.chainRequests).toHaveLength(0);

      // Defunder should submit a transaction since there is a conclusion proof and we are the transaction submitter.
      objective.data.txSubmitterOrder = [0, 1];
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: true,
        isChannelDefunded: false,
      });
      expect(response.chainRequests[0]).toMatchObject({
        type: 'ConcludeAndWithdraw',
        finalizationProof: channel.support,
      });

      // The channel has NOT been fully defunded.
      // Defunder does not complete
      await Funding.updateFunding(tx, channel.channelId, '0x03', testChannel.asset);
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });

      // The channel has been fully defunded
      // Defunder completes
      await Funding.updateFunding(tx, channel.channelId, '0x00', testChannel.asset);
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
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

    const response = new EngineResponse();

    const logger = createLogger(defaultTestWalletConfig());

    const channel = await Channel.forId(testChannel.channelId, testKnex);
    const defunder = new Defunder(store, logger);
    await AdjudicatorStatusModel.insertAdjudicatorStatus(testKnex, channel.channelId, 1, [
      state4,
      state3,
    ]);
    await AdjudicatorStatusModel.setFinalized(testKnex, channel.channelId, 1, 1, 1);

    await testKnex.transaction(async tx => {
      const objective = await ensureDefundObjective(testChannel, tx);

      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: true,
        isChannelDefunded: false,
      });

      expect(response.chainRequests[0]).toMatchObject({
        type: 'PushOutcomeAndWithdraw',
        state: state4,
        challengerAddress: channel.myAddress,
      });
      // The channel has been fully defunded
      // Defunder completes
      await Funding.updateFunding(tx, channel.channelId, '0x00', testChannel.asset);
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: true,
      });
    });
  });
});

describe('Ledger funded channel defunding', () => {
  it('Ledger channel is defunded', async () => {
    ledger.insertInto(store, {
      states: [
        {
          turn: 6,
          bals: [
            [ledger.participantA.destination, 0],
            [ledger.participantB.destination, 0],
            [testLedgerFundedChannel.channelId, 11],
          ],
          signedBy: 'both',
        },
      ],
    });
    // Channel has yet to be concluded
    await testLedgerFundedChannel.insertInto(store, {
      participant: 0,
      states: [3, 4],
      funds: 8,
    });

    const engineResponse = new EngineResponse();
    const logger = createLogger(defaultTestWalletConfig());
    const defunder = new Defunder(store, logger);

    let channel = await Channel.forId(testLedgerFundedChannel.channelId, testKnex);
    await testKnex.transaction(async tx => {
      const objective = await ensureCloseObjective(testLedgerFundedChannel, tx);

      // There is no conclusion proof
      expect(await defunder.crank(channel, objective, engineResponse, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(await store.getLedgerRequest(channel.channelId, 'defund', tx)).toBeUndefined();

      channel = await store.addSignedState(
        channel.channelId,
        testLedgerFundedChannel.wireState(5),
        tx
      );
      expect(await defunder.crank(channel, objective, engineResponse, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });

      // Defunder should store a ledger defunding request
      expect(await store.getLedgerRequest(channel.channelId, 'defund', tx)).toMatchObject({
        channelToBeFunded: channel.channelId,
        status: 'queued',
        type: 'defund',
      });

      await LedgerRequest.setRequestStatus(channel.channelId, 'defund', 'succeeded', tx);
      const response = new EngineResponse();
      // Defunder should is now done
      expect(await defunder.crank(channel, objective, response, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: true,
      });
    });
  });
});
