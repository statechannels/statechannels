import * as Knex from 'knex';

const funding = 'funding';
const transferredOut = 'transferredOut';
export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(funding, table => {
    table
      .specificType(transferredOut, 'jsonb')
      .notNullable()
      .defaultTo('[]');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(transferredOut);
}
