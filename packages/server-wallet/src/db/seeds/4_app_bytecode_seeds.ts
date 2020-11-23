import Knex from 'knex';

import { AppBytecode } from '../../models/app-bytecode';
import { appBytecode } from '../../models/__test__/fixtures/app-bytecode';

export async function seed(knex: Knex): Promise<void> {
  await knex('app_bytecode').truncate();

  await AppBytecode.query().insert([appBytecode()]);
}
