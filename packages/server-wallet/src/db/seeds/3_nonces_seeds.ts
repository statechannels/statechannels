import Knex from 'knex';

import {Nonce} from '../../models/nonce';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {nonce} from '../../models/__test__/fixtures/nonces';

const addresses = [bob, alice].map(p => p().signingAddress);
const seeds = [nonce(), nonce({addresses, value: 3})];

export async function seed(knex: Knex): Promise<void> {
  await knex('nonces').truncate();

  await Nonce.query().insert(seeds);
}
