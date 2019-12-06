import {Model} from 'objection';
import {EmbeddedProtocol} from '../../../constants';
import {PARTICIPANT_1_ADDRESS} from '../../../test/test-constants';
import WalletProcess from '../../models/WalletProcess';
import knex from '../../../db-admin/db-admin-connection';
Model.knex(knex);

export function seed() {
  // Deletes ALL existing entries
  return knex('wallet_processes')
    .del()
    .then(() =>
      WalletProcess.query().insert([
        {
          processId: '1234',
          theirAddress: PARTICIPANT_1_ADDRESS,
          protocol: EmbeddedProtocol.AdvanceChannel
        }
      ])
    );
}
