import {OpenChannel} from '@statechannels/wallet-core';

import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import {WaitingFor as ChannelOpenerWaitingFor} from '../../protocols/channel-opener';
import {Nothing} from '../../objectives/objective-manager';
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
  it('returns an objective with Date types for timestamps', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);
    const {objective: inserted} = await ObjectiveModel.insert(
      objective,
      false,
      knex,
      ChannelOpenerWaitingFor.theirPreFundSetup
    );

    expect(inserted.createdAt instanceof Date).toBe(true);
    expect(inserted.progressLastMadeAt instanceof Date).toBe(true);
  });
  it('fails to insert / associate an objective when it references a channel that does not exist', async () => {
    // For some reason this does not catch the error :/
    await expect(
      ObjectiveModel.insert(objective, false, knex, ChannelOpenerWaitingFor.theirPreFundSetup)
    ).rejects.toThrow();

    expect(await ObjectiveModel.query(knex).select()).toMatchObject([]);

    expect(await ObjectiveChannelModel.query(knex).select()).toMatchObject([]);
  });

  it('inserts and associates an objective with all channels that it references (channels exist)', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    await ObjectiveModel.insert(objective, false, knex, ChannelOpenerWaitingFor.theirPreFundSetup);

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
    const {objective: inserted} = await ObjectiveModel.insert(
      objective,
      false,
      knex,
      ChannelOpenerWaitingFor.theirPreFundSetup
    );
    const {createdAt} = inserted;

    const after = Date.now() + 1000; // scroll forward 1000 ms to allow for finite precision / rounding

    expect(createdAt.getTime() > before).toBe(true);
    expect(createdAt.getTime() < after).toBe(true);
  });

  it('updates the progressLastMadeAt timestamp on an objective when updateWaitingFor is called', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);
    const {objective: inserted} = await ObjectiveModel.insert(
      objective,
      false,
      knex,
      ChannelOpenerWaitingFor.theirPreFundSetup
    );
    const {objectiveId} = inserted;
    const before = Date.now() - 1000; // scroll back 1000 ms to allow for finite precision / rounding
    const {progressLastMadeAt} = await ObjectiveModel.updateWaitingFor(
      objectiveId,
      ChannelOpenerWaitingFor.theirPostFundState,
      knex
    );
    const after = Date.now() + 1000; // scroll forward 1000 ms to allow for finite precision / rounding

    expect(progressLastMadeAt.getTime() > before).toBe(true);
    expect(progressLastMadeAt.getTime() < after).toBe(true);
  });
});

describe('Objective > forId', () => {
  it('returns an objective with Date types for timestamps', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);
    await ObjectiveModel.insert(objective, false, knex, ChannelOpenerWaitingFor.theirPreFundSetup);

    const fetchedObjective = await ObjectiveModel.forId(`OpenChannel-${c.channelId}`, knex);
    expect(fetchedObjective.createdAt instanceof Date).toBe(true);
    expect(fetchedObjective.progressLastMadeAt instanceof Date).toBe(true);
  });
});
describe('Objective > doesExist', () => {
  it('returns false when an objective does not exist', async () => {
    const result = await ObjectiveModel.doesExist('FAKE-ID', knex);
    expect(result).toBe(false);
  });

  it('returns true when an objective does exist', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);
    const {objective: inserted} = await ObjectiveModel.insert(objective, false, knex);
    const {objectiveId} = inserted;
    const result = await ObjectiveModel.doesExist(objectiveId, knex);
    expect(result).toBe(true);
  });
});
describe('Objective > forChannelIds', () => {
  it('retrieves objectives associated with a given channelId', async () => {
    await Channel.query(knex).withGraphFetched('signingWallet').insert(c);

    await ObjectiveModel.insert(objective, false, knex, ChannelOpenerWaitingFor.theirPreFundSetup);

    expect(await ObjectiveModel.forChannelIds([c.channelId], knex)).toMatchObject([
      {objectiveId: `OpenChannel-${c.channelId}`},
    ]);
  });
});

describe('Default value for waitingFor', () => {
  it('Is an empty string', async () => {
    const returnedRow = await ObjectiveModel.query(knex)
      .insert({
        objectiveId: 'doesNotMatter',
        status: 'pending',
        type: objective.type,
        data: objective.data,
        createdAt: new Date(),
        progressLastMadeAt: new Date(),
      })
      .returning('*')
      .first();

    expect(returnedRow.waitingFor).toEqual('');
  });
  it('Exists in the app code type system', async () => {
    let waitFor: ObjectiveModel['waitingFor'] = ChannelOpenerWaitingFor.theirPreFundSetup;
    waitFor = Nothing.ToWaitFor;
    // ^^ would be a TS error if we forgot to include Nothing.ToWaitFor
    // in the type of ObjectiveModel
    expect(waitFor).toEqual('');
    // ^^ would be a runtime error if Nothing.ToWaitFor was set to
    // something other than the default value of this column.
    // Together these tests ensure we have the default value
    // of the column in the union of types we assert for it.
  });
});
