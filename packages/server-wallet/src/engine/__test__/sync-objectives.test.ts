import _ from 'lodash';

import {Engine} from '..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {ObjectiveModel} from '../../models/objective';
import {channel} from '../../models/__test__/fixtures/channel';

import {openChannelObjective} from './fixtures/open-channel-objective';
import {alice} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';

let engine: Engine;

beforeAll(async () => {
  await seedAlicesSigningWallet(testKnex);
  engine = await Engine.create(defaultTestConfig());
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
    expect(syncResults.outbox).toHaveLength(0);
  });

  it('generates a message containing specified objectives and channels', async () => {
    // Create the existing data
    const targetChannel = await Channel.query(testKnex)
      .insert(channel({vars: [stateWithHashSignedBy([alice()])()]}))
      .withGraphFetched('signingWallet')
      .withGraphFetched('funding');
    const objective = await ObjectiveModel.insert(openChannelObjective(), false, testKnex);

    const {channelId} = targetChannel;

    const result = await engine.syncObjectives([objective.objectiveId]);

    // We only expect 1 outbox
    expect(result.outbox).toHaveLength(1);

    const expectedPayload = {
      method: 'MessageQueued',
      params: {
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
      },
    };
    // We expect the message to contain the objective as well as the sync channel payload
    expect(result.outbox[0]).toMatchObject(expectedPayload);

    // We expect the message to be correctly indexed by objective id
    const objectiveIds = Object.keys(result.messagesByObjective);
    expect(objectiveIds).toHaveLength(1);
    const messagesByObjective = result.messagesByObjective[objectiveIds[0]];
    expect(messagesByObjective).toMatchObject([expectedPayload.params]);
  });
});
