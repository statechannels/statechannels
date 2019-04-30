import { Model } from 'objection';
import { DUMMY_RULES_ADDRESS } from '../../../constants';
import Rule from '../../models/rule';
import knex from '../connection';
Model.knex(knex);

import * as RPS from '../../../contracts/prebuilt_contracts/RockPaperScissorsGame.json';

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
          address: RPS.networks['3'].address,
          name: RPS.contractName,
        },
      ]);
    });
}
