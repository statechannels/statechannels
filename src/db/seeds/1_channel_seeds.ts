import { Channel } from '../../models/channel';
import { channel } from '../../wallet/__test__/fixtures/channel';
import knex from '../../db/connection';
import { stateWithHashSignedBy } from '../../wallet/__test__/fixtures/states';

const seeds = [
  channel(),
  channel({ channelNonce: 1234, vars: [stateWithHashSignedBy()()] }),
];

export async function seed() {
  await knex('channels').truncate();

  await Channel.query().insert(seeds);
}
