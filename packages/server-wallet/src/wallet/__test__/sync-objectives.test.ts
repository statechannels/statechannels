import _ from 'lodash';

import {Wallet} from '..';
import {testKnex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../../models/channel';
import {ObjectiveModel} from '../../models/objective';
import {channel} from '../../models/__test__/fixtures/channel';

import {openChannelObjective} from './fixtures/open-channel-objective';
import {bob, alice as aliceP} from './fixtures/participants';
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

    const syncResult = await wallet.syncObjectives([objective.objectiveId]);
    // TODO: Currently the objective model differs slightly from what we see on the message
    const massagedObjective = {
      ...objective,
      participants: [aliceP(), bob()],
    };
    expect(syncResult.newObjectives).toEqual([massagedObjective]);
    expect(syncResult.channelResults).toEqual([targetChannel.channelResult]);

    expect((syncResult.outbox[0].params.data as any).objectives).toEqual([
      expect.objectContaining(_.pick(objective, 'data')),
    ]);
  });
});
