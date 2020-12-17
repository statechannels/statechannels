import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable('ledger_proposals', table => {
    table.string('channel_id').notNullable();

    table.string('signing_address').notNullable();
    table.jsonb('proposal');
    table
      .integer('nonce')
      .notNullable()
      .defaultTo(0)
      .unsigned();

    table.index('channel_id');

    table.unique(['channel_id', 'signing_address']);

    table.foreign('channel_id').references('channels.channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTableIfExists('ledger_proposals');
}
