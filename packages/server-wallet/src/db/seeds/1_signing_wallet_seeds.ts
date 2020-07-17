import { SigningWallet } from '../../models/signing-wallet';
import { alice } from '../../wallet/__test__/fixtures/signingWallets';
import Knex from 'knex';
import { truncate } from '../../db-admin/db-admin-connection';

const seeds = [alice()];

export async function seed(knex: Knex) {
  await truncate(knex);
  await SigningWallet.query().insert(seeds);
}
