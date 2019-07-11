import { Model } from 'objection';
import { DUMMY_RULES_ADDRESS } from '../../../test-constants';
import Rule from '../../models/rule';
import knex from '../connection';
Model.knex(knex);

import * as contracts from '../../../utilities/contracts';

export function seed() {
  // Deletes ALL existing entries
  return knex('rules')
    .del()
    .then(() => {
      return Rule.query().insert([
        {
          address: DUMMY_RULES_ADDRESS,
          name: "DUMMY GAME -- DON't PLAY",
        },
        {
          address: contracts.rpsGameArtifact.networks['3'].address,
          name: contracts.rpsGameArtifact.contractName,
        },
      ]);
    });
}
