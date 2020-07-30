import Knex from 'knex';

import {SigningWallet} from '../../models/signing-wallet';
import {alice} from '../../wallet/__test__/fixtures/signing-wallets';
import {truncate} from '../../db-admin/db-admin-connection';

const seeds = [alice()];

export async function seedAlicesSigningWallet(knex: Knex): Promise<void> {
  await truncate(knex);
  await SigningWallet.query().insert(seeds);
}

// This is the function that `yarn knex seed` executes
export const seed = seedAlicesSigningWallet;
