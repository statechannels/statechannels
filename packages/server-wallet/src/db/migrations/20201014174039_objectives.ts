import * as Knex from 'knex';

const tableName = 'open-channel-objectives';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable(tableName, function(table) {
    table.integer('objective_id'); // TODO make primary key (we would violate this constraint now)
    table.string('status');
    table.string('type');
    table.string('target_channel_id');
    table.string('funding_strategy');
    table.string('ledger_id');
    table.string('joint_channel_id');
    table.string('guarantor_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
