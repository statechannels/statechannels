import { SigningWallet } from '../../models/signing-wallet';
import { alice } from '../../wallet/__test__/fixtures/signingWallets';
import Knex from 'knex';

const seeds = [alice()];

export async function seed(knex: Knex) {
  await knex('channels').delete();
  await knex('signing_wallets').delete();

  await SigningWallet.query().insert(seeds);
}
