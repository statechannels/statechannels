import Knex from 'knex';

import {Channel} from '../../models/channel';
import {channel} from '../../models/__test__/fixtures/channel';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';

const seeds = [channel(), channel({channelNonce: 1234, vars: [stateWithHashSignedBy()()]})];

export async function seed(knex: Knex): Promise<void> {
  await knex('channels').truncate();

  await Channel.query().insert(seeds);
}
