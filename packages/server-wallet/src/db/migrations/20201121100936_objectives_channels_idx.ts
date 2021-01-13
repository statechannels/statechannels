import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('objectives_channels', function (table) {
    table.index('channel_id');
  });
}

export async function down(_knex: Knex): Promise<void> {
  //
}
