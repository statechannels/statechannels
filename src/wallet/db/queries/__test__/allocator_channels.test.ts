import { errors } from '../../..';
import {
  SEEDED_ALLOCATIONS,
  SEEDED_CHANNELS,
  SEEDED_COMMITMENTS,
  SEEDED_PARTICIPANTS,
} from '../../../../test-constants';
import {
  constructors as testDataConstructors,
  created_channel,
  funded_channel,
} from '../../../../test/test_data';
import AllocatorChannel from '../../../models/allocatorChannel';
import knex from '../../connection';
import { constructors as seedDataConstructors, seeds } from '../../seeds/2_allocator_channels_seed';
import { queries } from '../allocator_channels';

describe('updateAllocatorChannel', () => {
  describe('when theirCommitment is a PreFundSetup', () => {
    it("works when the channel doesn't exist", async () => {
      const allocator_channel = await queries.updateAllocatorChannel(
        [testDataConstructors.pre_fund_setup(0)],
        testDataConstructors.pre_fund_setup(1),
      );
      expect.assertions(5);

      expect(allocator_channel).toMatchObject(created_channel);
      expect((await knex('allocator_channels').select('*')).length).toEqual(SEEDED_CHANNELS + 1);
      expect((await knex('allocator_channel_commitments').select('*')).length).toEqual(
        SEEDED_COMMITMENTS + 2,
      );

      expect((await knex('allocations').select('*')).length).toEqual(SEEDED_ALLOCATIONS + 4);

      expect((await knex('allocator_channel_participants').select('*')).length).toEqual(
        SEEDED_PARTICIPANTS + 2,
      );
    });

    it('throws when the channel exists', async () => {
      const theirCommitment = testDataConstructors.pre_fund_setup(0);
      theirCommitment.channel = funded_channel;
      const hubCommitment = testDataConstructors.pre_fund_setup(1);
      expect.assertions(1);
      await queries.updateAllocatorChannel([theirCommitment], hubCommitment).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_EXISTS);
      });
    });
  });

  describe('when theirCommitment is not a PreFundSetup', () => {
    it('works when the channel exists', async () => {
      const { nonce, channelType } = testDataConstructors.post_fund_setup(2).channel;
      const existing_allocator_channel = await AllocatorChannel.query()
        .where({ nonce, rules_address: channelType })
        .eager('[commitments.[allocations],participants]')
        .first();

      expect(existing_allocator_channel).toMatchObject(seeds.funded_channel);

      const updated_allocator_channel = await queries.updateAllocatorChannel(
        [testDataConstructors.post_fund_setup(2)],
        testDataConstructors.post_fund_setup(3),
      );

      expect(updated_allocator_channel).toMatchObject({
        ...seeds.funded_channel,
        commitments: [
          seedDataConstructors.post_fund_setup(2),
          seedDataConstructors.post_fund_setup(3),
        ],
      });

      expect((await knex('allocator_channels').select('*')).length).toEqual(SEEDED_CHANNELS);
      expect(
        (await knex('allocator_channel_commitments')
          .where({ allocator_channel_id: updated_allocator_channel.id })
          .select('*')).length,
      ).toEqual(2);

      expect((await knex('allocations').select('*')).length).toEqual(SEEDED_ALLOCATIONS);

      expect((await knex('allocator_channel_participants').select('*')).length).toEqual(
        SEEDED_PARTICIPANTS,
      );
    });
    it("throws when the channel doesn't exist and the commitment is not PreFundSetup", async () => {
      expect.assertions(1);
      const theirCommitment = testDataConstructors.post_fund_setup(0);
      theirCommitment.channel = { ...funded_channel, nonce: 1234 };
      const hubCommitment = testDataConstructors.post_fund_setup(1);
      expect.assertions(1);
      await queries.updateAllocatorChannel([theirCommitment], hubCommitment).catch(err => {
        expect(err).toMatchObject(errors.CHANNEL_MISSING);
      });
    });
  });
});
