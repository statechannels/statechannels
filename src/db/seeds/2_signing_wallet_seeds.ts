import { SigningWallet } from '../../models/signing-wallet';
import { alice, bob } from '../../wallet/__test__/fixtures/signingWallets';
import knex from '../../db/connection';

const seeds = [alice(), bob()];

export async function seed() {
  await knex('signing_wallets').truncate();

  await SigningWallet.query().insert(seeds);
}
