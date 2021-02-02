import * as Knex from 'knex';

const column = 'target_channel_id';

export async function up(knex: Knex): Promise<void> {
  const unsafe = await knex('objectives_channels')
    .count()
    .groupBy('objective_id')
    .having(knex.raw('count(*) > 1'))
    .limit(1);

  if (unsafe.length === 1) {
    console.error(unsafe);
    throw new Error('unsafe migration');
  }

  await knex.schema.alterTable('objectives', table => table.text(column));

  await knex.raw(`\
  UPDATE objectives 
  SET target_channel_id = (
      SELECT channel_id
      FROM objectives_channels
      WHERE objectives_channels.objective_id = objectives.objective_id
  );`);

  // FIXME: edit data ?

  await knex.schema.alterTable('objectives', table => {
    table.foreign(column).references('channels.channel_id');
    table.text(column).notNullable().alter();
    table.text('data').nullable().alter();
  });

  await knex.schema.dropTable('objectives_channels');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('objectives', table => table.dropColumn(column));
}
