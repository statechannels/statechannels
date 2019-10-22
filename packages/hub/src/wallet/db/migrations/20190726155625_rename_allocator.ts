import * as Knex from 'knex';

exports.up = (knex: Knex) => {
  return knex.schema
    .renameTable('allocator_channels', 'channels')
    .then(() => {
      return knex.schema
        .renameTable('allocator_channel_participants', 'channel_participants')
        .then(() => {
          return knex.schema.table('channel_participants', table => {
            table.renameColumn('allocator_channel_id', 'channel_id');
          });
        });
    })
    .then(() => {
      return knex.schema
        .renameTable('allocator_channel_commitments', 'channel_commitments')
        .then(() => {
          return knex.schema.table('channel_commitments', table => {
            table.renameColumn('allocator_channel_id', 'channel_id');
          });
        });
    })
    .then(() => {
      return knex.schema.table('allocations', table => {
        table.renameColumn('allocator_channel_commitment_id', 'channel_commitment_id');
      });
    });
};

exports.down = (knex: Knex) => {
  return knex.schema
    .renameTable('channels', 'allocator_channels')
    .then(() => {
      return knex.schema
        .renameTable('channel_participants', 'allocator_channel_participants')
        .then(() => {
          return knex.schema.table('allocator_channel_participants', table => {
            table.renameColumn('channel_id', 'allocator_channel_id');
          });
        });
    })
    .then(() => {
      return knex.schema
        .renameTable('channel_commitments', 'allocator_channel_commitments')
        .then(() => {
          return knex.schema.table('allocator_channel_commitments', table => {
            table.renameColumn('channel_id', 'allocator_channel_id');
          });
        });
    })
    .then(() => {
      return knex.schema.table('allocations', table => {
        table.renameColumn('channel_commitment_id', 'allocator_channel_commitment_id');
      });
    });
};
