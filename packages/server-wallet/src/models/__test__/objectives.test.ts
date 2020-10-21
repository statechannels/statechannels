import {OpenChannel} from '@statechannels/wallet-core';

import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {Channel} from '../channel';
import {Objective, ObjectiveChannel} from '../objective';

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

describe('Objective model', () => {
  it.skip('fails to insert / associate an objective when it references a channel that does not exist', async () => {
    // For some reason this does not catch the error :/
    await expect(Objective.insert({...objective, status: 'pending'}, knex)).rejects.toThrow();

    expect(await Objective.query(knex).select()).toMatchObject([]);

    expect(await ObjectiveChannel.query(knex).select()).toMatchObject([]);
  });

  it('inserts and associates an objective with all channels that it references (channels exist)', async () => {
    await Channel.query(knex)
      .withGraphFetched('signingWallet')
      .insert(c);

    await Objective.insert({...objective, status: 'pending'}, knex);

    expect(await Objective.query(knex).select()).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`},
    ]);

    expect(await ObjectiveChannel.query(knex).select()).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`, channelId: c.channelId},
    ]);
  });
});
