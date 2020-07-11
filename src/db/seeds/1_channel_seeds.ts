import { Channel } from '../../models/channel';
import { channel } from '../../wallet/__test__/fixtures/channel';
import knex from '../../db-admin/db-admin-connection';
import { stateWithSignaturesAndHash } from '../../wallet/__test__/fixtures/states';

const seeds = [
  channel(),
  channel({ channelNonce: 1234, vars: [stateWithSignaturesAndHash()] }),
].map(c => c.toColumns());

// *******
// Exports
// *******

export function seed() {
  return knex('channels')
    .del()
    .then(() => Channel.query().insert(seeds.map(Channel.prepareJsonBColumns)));
}
