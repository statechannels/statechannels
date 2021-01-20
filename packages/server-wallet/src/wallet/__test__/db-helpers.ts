import Knex from 'knex';

import {extractDBConfigFromServerWalletConfig, ServerWalletConfig} from '../../config';
import {DBAdmin} from '../../db-admin/db-admin';

export async function createAndMigrateDatabase(walletConfig: ServerWalletConfig): Promise<void> {
  const knex = Knex(extractDBConfigFromServerWalletConfig(walletConfig));
  const admin = new DBAdmin(knex);
  await admin.dropDB();
  await admin.createDB();
  await admin.migrateDB();
  await knex.destroy();
}
export async function dropDatabase(walletConfig: ServerWalletConfig): Promise<void> {
  const knex = Knex(extractDBConfigFromServerWalletConfig(walletConfig));
  const admin = new DBAdmin(knex);
  await admin.dropDB();

  await knex.destroy();
}
