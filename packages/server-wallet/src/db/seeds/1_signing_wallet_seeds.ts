import Knex from 'knex';

import {DBAdmin} from '../../db-admin/db-admin';
import {SigningWallet} from '../../models/signing-wallet';
import {alice, bob} from '../../engine/__test__/fixtures/signing-wallets';

export async function seedAlicesSigningWallet(knex: Knex): Promise<void> {
  await DBAdmin.truncateDataBaseFromKnex(knex);
  await SigningWallet.query(knex).insert(alice());
}

export async function seedBobsSigningWallet(knex: Knex): Promise<void> {
  await DBAdmin.truncateDataBaseFromKnex(knex);
  await SigningWallet.query(knex).insert([bob()]);
}
// This is the function that `yarn knex seed` executes
export const seed = seedAlicesSigningWallet;
