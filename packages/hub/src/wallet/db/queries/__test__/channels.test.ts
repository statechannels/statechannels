import {constructors as testDataConstructors, created_channel} from '../../../../test/test_data';
import Channel from '../../../models/channel';
import knex from '../../connection';
import {
  constructors as seedDataConstructors,
  SEEDED_ALLOCATIONS,
  SEEDED_CHANNELS,
  SEEDED_PARTICIPANTS,
  SEEDED_STATES,
  seeds
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
  });

  describe('when theirState is not a PreFundSetup', () => {
    it('works when the channel exists', async () => {
      const {channelNonce: nonce} = testDataConstructors.post_fund_setup(2).channel;
      const {appDefinition: rules_address} = testDataConstructors.post_fund_setup(2);
      const existing_allocator_channel = await Channel.query()
        .where({nonce, rules_address})
        .eager('[states.[allocations],participants]')
        .first();

      expect(existing_allocator_channel).toMatchObject(seeds.funded_channel);

      const updated_allocator_channel = await queries.updateChannel(
        [testDataConstructors.post_fund_setup(2)],
        testDataConstructors.post_fund_setup(3)
      );

      expect(updated_allocator_channel).toMatchObject({
        ...seeds.funded_channel,
        states: [seedDataConstructors.post_fund_setup(2), seedDataConstructors.post_fund_setup(3)]
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
  });
});
