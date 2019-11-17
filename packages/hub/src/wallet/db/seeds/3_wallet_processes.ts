import {EmbeddedProtocol} from '@statechannels/wallet/lib/src/communication';
import {Model} from 'objection';
import {PARTICIPANT_1_ADDRESS} from '../../../test/test-constants';
import WalletProcess from '../../models/WalletProcess';
import knex from '../connection';
Model.knex(knex);

export function seed() {
  // Deletes ALL existing entries
  return knex('wallet_processes')
    .del()
    .then(() => {
      return WalletProcess.query().insert([
        {
          processId: '1234',
          theirAddress: PARTICIPANT_1_ADDRESS,
          protocol: EmbeddedProtocol.AdvanceChannel
        }
      ]);
    });
}
