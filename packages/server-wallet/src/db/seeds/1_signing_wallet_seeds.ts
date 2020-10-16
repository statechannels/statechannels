import Knex from 'knex';

import {DBAdmin} from '../../db-admin/db-admin';
import {SigningWallet} from '../../models/signing-wallet';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';

const seeds = [alice()];

export async function seedAlicesSigningWallet(knex: Knex): Promise<void> {
  await new DBAdmin(knex).truncateDB();
  await SigningWallet.query(knex).insert(seeds);
}

// This is the function that `yarn knex seed` executes
export const seed = seedAlicesSigningWallet;
