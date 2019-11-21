import {errors} from '../../..';
import {
  created_channel,
  fundedChannel,
  stateConstructors as testDataConstructors
} from '../../../../test/test_data';
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

describe('updateChannel', () => {
  describe('when theirState is a PreFundSetup', () => {
    it("works when the channel doesn't exist", async () => {
      const allocator_channel = await queries.updateChannel(
        [testDataConstructors.pre_fund_setup(0)],
        testDataConstructors.pre_fund_setup(1)
      );
      expect.assertions(5);

      expect(allocator_channel).toMatchObject(created_channel);
      expect((await knex('channels').select('*')).length).toEqual(SEEDED_CHANNELS + 1);
      expect((await knex('channel_states').select('*')).length).toEqual(SEEDED_STATES + 2);

      expect((await knex('allocations').select('*')).length).toEqual(SEEDED_ALLOCATIONS + 4);

      expect((await knex('channel_participants').select('*')).length).toEqual(
        SEEDED_PARTICIPANTS + 2
      );
    });

    it('throws when the channel exists', async () => {
      const theirState = testDataConstructors.pre_fund_setup(0);
      theirState.channel = fundedChannel;
      const hubState = testDataConstructors.pre_fund_setup(1);
      expect.assertions(1);
      await queries.updateChannel([theirState], hubState).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_EXISTS);
      });
    });
  });

  describe('when theirState is not a PreFundSetup', () => {
    it('works when the channel exists', async () => {
      const {channelNonce} = testDataConstructors.post_fund_setup(2).channel;
      const existing_allocator_channel = await Channel.query()
        .findOne({channel_nonce: channelNonce})
        .eager('[states.[outcome.[allocation]], participants]');

      expect(existing_allocator_channel).toMatchObject(seeds.fundedChannelWithStates);

      const updated_allocator_channel = await queries.updateChannel(
        [testDataConstructors.post_fund_setup(2)],
        testDataConstructors.post_fund_setup(3)
      );

      expect(updated_allocator_channel).toMatchObject({
        ...seeds.fundedChannelWithStates,
        states: [
          seedDataConstructors.postFundSetupState(2),
          seedDataConstructors.postFundSetupState(3)
        ]
      });

      expect((await knex('channels').select('*')).length).toEqual(SEEDED_CHANNELS);
      expect(
        (await knex('channel_states')
          .where({channel_id: updated_allocator_channel.id})
          .select('*')).length
      ).toEqual(2);

      expect((await knex('allocations').select('*')).length).toEqual(SEEDED_ALLOCATIONS);

      expect((await knex('channel_participants').select('*')).length).toEqual(SEEDED_PARTICIPANTS);
    });

    it("throws when the channel doesn't exist and the commitment is not PreFundSetup", async () => {
      expect.assertions(1);
      const theirState = testDataConstructors.post_fund_setup(2);
      theirState.channel = {...fundedChannel, channelNonce: '1234'};
      const hubState = testDataConstructors.post_fund_setup(1);
      expect.assertions(1);
      await queries.updateChannel([theirState], hubState).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_MISSING);
      });
    });
  });
});
