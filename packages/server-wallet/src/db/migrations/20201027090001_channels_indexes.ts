import * as Knex from 'knex';

const COLUMNS = ['participants'];

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable('channels', function (t) {
    t.index(COLUMNS);
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable('channels', function (t) {
    t.dropIndex(COLUMNS);
  });
}
