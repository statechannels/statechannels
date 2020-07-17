import knex from '../../db/connection';
import {nonce} from '../../models/__test__/fixtures/nonces';
import {Nonce} from '../../models/nonce';
import {bob, alice} from '../../wallet/__test__/fixtures/participants';

const addresses = [bob, alice].map(p => p().signingAddress);
const seeds = [nonce(), nonce({addresses, value: 3})];

export async function seed() {
  await knex('nonces').truncate();

  await Nonce.query().insert(seeds);
}
