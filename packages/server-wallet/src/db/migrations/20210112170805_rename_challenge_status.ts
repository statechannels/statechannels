import * as Knex from 'knex';

const old_table_name = 'challenge_status';
const new_table_name = 'adjudicator_status';
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE ${old_table_name} RENAME TO ${new_table_name}`);

  await knex.schema.alterTable(new_table_name, table => {
    table.dropColumn('challenge_state');
    table.specificType('states', 'jsonb[]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE ${new_table_name} RENAME TO ${old_table_name}`);

  await knex.schema.alterTable(old_table_name, table => {
    table.dropColumn('states');
    table.jsonb('challenge_state');
  });
}
