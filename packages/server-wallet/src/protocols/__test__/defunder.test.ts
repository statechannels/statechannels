import {defaultTestConfig} from '../..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {MockChainService} from '../../chain-service';
import {DBAdmin} from '../../db-admin/db-admin';
import {createLogger} from '../../logger';
import {AdjudicatorStatusModel} from '../../models/adjudicator-status';
import {Channel} from '../../models/channel';
import {Funding} from '../../models/funding';
import {LedgerRequest} from '../../models/ledger-request';
import {Store} from '../../wallet/store';
import {TestChannel} from '../../wallet/__test__/fixtures/test-channel';
import {Defunder} from '../defunder';

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

beforeEach(async () => {
  await DBAdmin.truncateDataBaseFromKnex(testKnex);

  store = new Store(
    testKnex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0'
  );
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

    testKnex.transaction(async tx => {
      // Defunder should take no actions as there is no conclusion proof.
      expect(await defunder.crank(channel, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(spy).not.toHaveBeenCalled();

      // Defunder should submit a transaction since there is a conclusion proof.
      const state = testChannel.wireState(5);
      channel = await store.addSignedState(channel.channelId, state, tx);
      expect(await defunder.crank(channel, tx)).toEqual({
        didSubmitTransaction: true,
        isChannelDefunded: false,
      });
      expect(spy).toHaveBeenCalledWith(channel.support);

      // The channel has NOT been fully defunded.
      // Defunder does not complete
      await Funding.updateFunding(tx, channel.channelId, '0x03', testChannel.assetHolderAddress);
      expect(await defunder.crank(channel, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });

      // The channel has been fully defunded
      // Defunder completes
      await Funding.updateFunding(tx, channel.channelId, '0x00', testChannel.assetHolderAddress);
      expect(await defunder.crank(channel, tx)).toEqual({
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
      expect(await defunder.crank(channel, tx)).toEqual({
        didSubmitTransaction: true,
        isChannelDefunded: false,
      });
      expect(spy).toHaveBeenCalledWith(state4, channel.myAddress);

      // The channel has been fully defunded
      // Defunder completes
      await Funding.updateFunding(tx, channel.channelId, '0x00', testChannel.assetHolderAddress);
      expect(await defunder.crank(channel, tx)).toEqual({
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
      // There is no conclusion proof
      expect(await defunder.crank(channel, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: false,
      });
      expect(await store.getLedgerRequest(channel.channelId, 'defund', tx)).toBeUndefined();

      channel = await store.addSignedState(channel.channelId, testLedgerChannel.wireState(5), tx);
      expect(await defunder.crank(channel, tx)).toEqual({
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
      expect(await defunder.crank(channel, tx)).toEqual({
        didSubmitTransaction: false,
        isChannelDefunded: true,
      });
    });
  });
});
