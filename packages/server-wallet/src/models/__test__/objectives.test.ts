import {OpenChannel} from '@statechannels/wallet-core';

import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../channel';
import {ObjectiveModel, ObjectiveChannelModel} from '../objective';

import {channel} from './fixtures/channel';

const c = channel();
const objective: OpenChannel = {
  type: 'OpenChannel',
  participants: [],
  data: {
    targetChannelId: c.channelId,
    fundingStrategy: 'Direct',
  },
};
beforeEach(async () => {
  await seedAlicesSigningWallet(knex);
});

describe('Objective > insert', () => {
  it('fails to insert / associate an objective when it references a channel that does not exist', async () => {
    // For some reason this does not catch the error :/
    await expect(ObjectiveModel.insert({...objective, status: 'pending'}, knex)).rejects.toThrow();

    expect(await ObjectiveModel.query(knex).select()).toMatchObject([]);

    expect(await ObjectiveChannelModel.query(knex).select()).toMatchObject([]);
  });

  it('inserts and associates an objective with all channels that it references (channels exist)', async () => {
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ObjectiveModel.insert({...objective, status: 'pending'}, knex);

    expect(await ObjectiveModel.query(knex).select()).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`},
    ]);

    expect(await ObjectiveChannelModel.query(knex).select()).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`, channelId: c.channelId},
    ]);
  });
});

describe('Objective > forChannelIds', () => {
  it('retrieves objectives associated with a given channelId', async () => {
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await ObjectiveModel.insert({...objective, status: 'pending'}, knex);

    expect(await ObjectiveModel.forChannelIds([c.channelId], knex)).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`},
    ]);
  });
});
