import { Channel } from '../../models/channel';
import { channel } from '../../wallet/__test__/fixtures/channel';
import knex from '../../db/connection';
import { stateWithSignaturesAndHash } from '../../wallet/__test__/fixtures/states';

const seeds = [
  channel(),
  channel({ channelNonce: 1234, vars: [stateWithSignaturesAndHash()] }),
];

export async function seed() {
  await knex('channels').truncate();

  await Channel.query().insert(seeds);
}
