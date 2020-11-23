import * as Knex from 'knex';

const appBytecode = 'app_bytecode';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(appBytecode, function (table) {
    table.string('chain_id').notNullable();

    table.string('app_definition').notNullable();
    table.text('app_bytecode').notNullable();
    table.primary(['chain_id', 'app_definition']);
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(appBytecode);
}
