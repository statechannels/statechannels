import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable('channels', function(t) {
    t.index('assetHolderAddress');
    t.index('participants');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable('channels', function(t) {
    t.dropIndex('assetHolderAddress');
    t.dropIndex('participants');
  });
}
