import {errors} from '../../..';
import {fundedChannel, stateConstructors as testDataConstructors} from '../../../../test/test-data';
import Channel from '../../../models/channel';
import knex from '../../connection';
import {
  SEEDED_ALLOCATIONS,
  SEEDED_CHANNELS,
  SEEDED_PARTICIPANTS,
  SEEDED_STATES,
  seeds,
  stateConstructors as seedDataConstructors
} from '../../seeds/2_allocator_channels_seed';
import {queries} from '../channels';
import {createdChannel} from '../../../../test/test-responses';

afterAll(() => {
  knex.destroy();
});

describe('updateChannel', () => {
  describe('when theirState is a PreFundSetup', () => {
    it("works when the channel doesn't exist", async () => {
      const allocatorChannel = await queries.updateChannel(
        [testDataConstructors.prefundSetup(0)],
        testDataConstructors.prefundSetup(1)
      );
      expect.assertions(5);

      expect(allocatorChannel).toMatchObject(createdChannel);
      expect(await knex('channels').select('*')).toHaveLength(SEEDED_CHANNELS + 1);
      expect(await knex('channel_states').select('*')).toHaveLength(SEEDED_STATES + 2);

      expect(await knex('allocation_items').select('*')).toHaveLength(SEEDED_ALLOCATIONS + 4);

      expect(await knex('channel_participants').select('*')).toHaveLength(SEEDED_PARTICIPANTS + 2);
    });

    it('throws when the channel exists', async () => {
      const theirState = testDataConstructors.prefundSetup(0);
      theirState.channel = fundedChannel;
      const hubState = testDataConstructors.prefundSetup(1);
      expect.assertions(1);
      await queries.updateChannel([theirState], hubState).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_EXISTS);
      });
    });
  });

  describe('when theirState is not a PreFundSetup', () => {
    it('works when the channel exists', async () => {
      const {channelNonce} = testDataConstructors.postfundSetup(2).channel;
      const existingAllocatorChannel = await Channel.query()
        .findOne({channel_nonce: channelNonce})
        .eager('[states.[outcome.[allocationItems]], participants, holdings]');

      expect(existingAllocatorChannel).toMatchObject(seeds.fundedChannelWithStates);

      const updatedAllocatorChannel = await queries.updateChannel(
        [testDataConstructors.postfundSetup(2)],
        testDataConstructors.postfundSetup(3)
      );

      expect(updatedAllocatorChannel).toMatchObject({
        ...seeds.fundedChannelWithStates,
        states: [
          seedDataConstructors.postfundSetupState(2),
          seedDataConstructors.postfundSetupState(3)
        ]
      });

      expect(await knex('channels').select('*')).toHaveLength(SEEDED_CHANNELS);
      expect(
        await knex('channel_states')
          .where({channel_id: updatedAllocatorChannel.id})
          .select('*')
      ).toHaveLength(2);

      expect(await knex('allocation_items').select('*')).toHaveLength(SEEDED_ALLOCATIONS);

      expect(await knex('channel_participants').select('*')).toHaveLength(SEEDED_PARTICIPANTS);
    });

    it("throws when the channel doesn't exist and the commitment is not PreFundSetup", async () => {
      expect.assertions(1);
      const theirState = testDataConstructors.postfundSetup(2);
      theirState.channel = {...fundedChannel, channelNonce: '1234'};
      const hubState = testDataConstructors.postfundSetup(1);
      expect.assertions(1);
      await queries.updateChannel([theirState], hubState).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_MISSING);
      });
    });
  });
});
