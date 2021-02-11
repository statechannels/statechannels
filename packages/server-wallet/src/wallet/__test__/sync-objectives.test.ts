import _ from 'lodash';

import {Wallet} from '..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {ObjectiveModel} from '../../models/objective';
import {channel} from '../../models/__test__/fixtures/channel';

import {openChannelObjective} from './fixtures/open-channel-objective';
import {alice} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';

let wallet: Wallet;

beforeAll(async () => {
  await seedAlicesSigningWallet(testKnex);
  wallet = await Wallet.create(defaultTestConfig());
});

afterAll(async () => {
  await wallet.destroy();
});
describe('SyncObjective', () => {
  it('throws an error if an objectiveId does not exist', async () => {
    await expect(wallet.syncObjectives(['FAKE'])).rejects.toThrow('Could not find all objectives');
  });

  it('handles being called with no objective ids', async () => {
    const syncResults = await wallet.syncObjectives([]);
    expect(syncResults.channelResults).toHaveLength(0);
    expect(syncResults.newObjectives).toHaveLength(0);
    expect(syncResults.outbox).toHaveLength(0);
  });

  it('generates a message containing specified objectives and channels', async () => {
    // Create the existing data
    const targetChannel = await Channel.query(testKnex)
      .insert(channel({vars: [stateWithHashSignedBy([alice()])()]}))
      .withGraphFetched('signingWallet')
      .withGraphFetched('funding');
    const objective = await ObjectiveModel.insert(openChannelObjective(), testKnex);

    const {channelId} = targetChannel;

    const {newObjectives, outbox, channelResults} = await wallet.syncObjectives([
      objective.objectiveId,
    ]);

    // There should be no new objectives
    expect(newObjectives).toHaveLength(0);
    // We should get the channel result for any channels we need to sync
    expect(channelResults).toEqual([targetChannel.channelResult]);

    // We only expect 1 outbox
    expect(outbox).toHaveLength(1);

    // We expect the message to contain the objective as well as the sync channel payload
    expect(outbox[0]).toMatchObject({
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
    });
  });
});
