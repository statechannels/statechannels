import _ from 'lodash';

import {defaultTestEngineConfig, Engine} from '..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {defaultTestWalletConfig} from '../../config';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {createLogger} from '../../logger';
import {Channel} from '../../models/channel';
import {ObjectiveModel} from '../../models/objective';
import {channel} from '../../models/__test__/fixtures/channel';

import {openChannelObjective} from './fixtures/open-channel-objective';
import {alice} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';
import {TestChannel} from './fixtures/test-channel';
import {TestLedgerChannel} from './fixtures/test-ledger-channel';

let engine: Engine;

beforeAll(async () => {
  await seedAlicesSigningWallet(testKnex);
  const logger = createLogger(defaultTestWalletConfig());
  engine = await Engine.create(defaultTestEngineConfig(), logger);
});

afterAll(async () => {
  await engine.destroy();
});
describe('SyncObjective', () => {
  it('throws an error if an objectiveId does not exist', async () => {
    await expect(engine.syncObjectives(['FAKE'])).rejects.toThrow('Could not find all objectives');
  });

  it('handles being called with no objective ids', async () => {
    const syncResults = await engine.syncObjectives([]);
    expect(syncResults).toHaveLength(0);
  });

  it('generates a message containing specified objectives and channels', async () => {
    // Create the existing data
    const targetChannel = await Channel.query(testKnex)
      .insert(channel({vars: [stateWithHashSignedBy([alice()])()]}))
      .withGraphFetched('signingWallet')
      .withGraphFetched('funding');
    const objective = await ObjectiveModel.insert(openChannelObjective(), testKnex);

    const {channelId} = targetChannel;

    const result = await engine.syncObjectives([objective.objectiveId]);

    // We only expect 1 outbox
    expect(result).toHaveLength(1);

    const expectedPayload = {
      sender: 'alice',
      recipient: 'bob',
      data: {
        // We expect our latest state for the channel (from syncChannel)
        signedStates: [expect.objectContaining({turnNum: 0, channelId})],
        // We expect a getChannel request (from syncChannel)
        requests: [expect.objectContaining({channelId, type: 'GetChannel'})],
        // We expect the objective to be in the message
        objectives: [{type: 'OpenChannel', data: {targetChannelId: channelId}}],
      },
    };
    // We expect the message to contain the objective as well as the sync channel payload
    expect(result[0]).toMatchObject(expectedPayload);
  });

  it('includes the ledger channel when syncing a ledger funded open channel objective', async () => {
    // We up the nonce to avoid collisions with the other tests not using TestChannel
    TestChannel.maximumNonce = 100;
    const ledger = TestLedgerChannel.create({});
    const app = TestChannel.create({
      fundingStrategy: 'Ledger',
      fundingLedgerChannelId: ledger.channelId,
    });
    await ledger.insertInto(engine.store);
    await app.insertInto(engine.store);

    const objective = await ObjectiveModel.insert(
      openChannelObjective({
        data: {
          targetChannelId: app.channelId,
          fundingStrategy: 'Ledger',
          fundingLedgerChannelId: ledger.channelId,
        },
      }),
      testKnex
    );

    const result = await engine.syncObjectives([objective.objectiveId]);

    // We only expect 1 outbox
    expect(result).toHaveLength(1);

    const expectedPayload = {
      sender: 'alice',
      recipient: 'bob',
      data: {
        // We expect states for the app channel as well as the ledger channel that funds it
        signedStates: [
          expect.objectContaining({channelId: ledger.channelId}),
          expect.objectContaining({channelId: app.channelId}),
        ],
        // We expect a getChannel request (from syncChannel) for both channels
        requests: [
          expect.objectContaining({channelId: ledger.channelId, type: 'GetChannel'}),
          expect.objectContaining({channelId: app.channelId, type: 'GetChannel'}),
        ],
      },
    };

    expect(result[0]).toMatchObject(expectedPayload);
  });
});
