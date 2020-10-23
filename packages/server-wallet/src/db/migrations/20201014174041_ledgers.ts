import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function(table) {
    table.string('asset_holder_address');
  });
}

export async function down(knex: Knex): Promise<any> {}
