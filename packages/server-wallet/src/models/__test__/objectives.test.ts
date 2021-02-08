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
    role: 'app',
  },
};
beforeEach(async () => {
  await seedAlicesSigningWallet(knex); // this also truncates
});

describe('Objective > insert', () => {
  it('fails to insert / associate an objective when it references a channel that does not exist', async () => {
    // For some reason this does not catch the error :/
    await expect(ObjectiveModel.insert({...objective, status: 'pending'}, knex)).rejects.toThrow();

    expect(await ObjectiveModel.query(knex).select()).toMatchObject([]);

    expect(await ObjectiveChannelModel.query(knex).select()).toMatchObject([]);
  });

  it('inserts and associates an objective with all channels that it references (channels exist)', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    await ObjectiveModel.insert({...objective, status: 'pending'}, knex);

    expect(await ObjectiveModel.query(knex).select()).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`},
    ]);

    expect(await ObjectiveChannelModel.query(knex).select()).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`, channelId: c.channelId},
    ]);
  });

  it('inserts an objective with a createdAt timestamp', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    const before = Date.now() - 1000; // scroll back 1000 ms to allow for finite precision / rounding
    const {createdAt} = await ObjectiveModel.insert({...objective, status: 'pending'}, knex);
    const after = Date.now() + 1000; // scroll forward 1000 ms to allow for finite precision / rounding

    expect(Date.parse(createdAt) > before).toBe(true);
    expect(Date.parse(createdAt) < after).toBe(true);
  });

  it('updates the timestamp on an objective when it succeeds', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);
    const {objectiveId} = await ObjectiveModel.insert({...objective, status: 'pending'}, knex);

    const before = Date.now() - 1000; // scroll back 1000 ms to allow for finite precision / rounding
    const {updatedAt} = await ObjectiveModel.succeed(objectiveId, knex);
    const after = Date.now() + 1000; // scroll forward 1000 ms to allow for finite precision / rounding

    expect(Date.parse(updatedAt) > before).toBe(true);
    expect(Date.parse(updatedAt) < after).toBe(true);
  });
});

describe('Objective > forChannelIds', () => {
  it('retrieves objectives associated with a given channelId', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    await ObjectiveModel.insert({...objective, status: 'pending'}, knex);

    expect(await ObjectiveModel.forChannelIds([c.channelId], knex)).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`},
    ]);
  });
});
