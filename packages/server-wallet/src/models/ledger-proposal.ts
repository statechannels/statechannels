import {JSONSchema, Model, TransactionOrKnex} from 'objection';
import {Address, SimpleAllocation} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly proposal: SimpleAllocation | null;
  readonly nonce: number;
  readonly signingAddress: Address;
}

const REQUIRED_COLUMNS = ['channelId', 'proposal', 'nonce', 'signingAddress'] as const;

export class LedgerProposal extends Model implements RequiredColumns {
  static tableName = 'ledger_proposals';

  readonly channelId!: Bytes32;
  readonly proposal!: SimpleAllocation | null;
  readonly nonce!: number;
  readonly signingAddress!: Address;

  static get idColumn(): string {
    return 'channelId';
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: [...REQUIRED_COLUMNS],
    };
  }

  static async forChannel(
    channelId: Bytes32,
    txOrKnex: TransactionOrKnex
  ): Promise<LedgerProposal[]> {
    return await LedgerProposal.query(txOrKnex).where({channelId});
  }

  static async setProposalsToNull(channelId: Bytes32, txOrKnex: TransactionOrKnex): Promise<void> {
    await LedgerProposal.query(txOrKnex).where({channelId}).patch({proposal: null});
  }

  static async storeProposal(
    {channelId, signingAddress, proposal, nonce}: RequiredColumns,
    txOrKnex: TransactionOrKnex
  ): Promise<void> {
    // TODO: Do this in a single SQL query (could not figure out how in time)

    const ledgerProposal = await LedgerProposal.query(txOrKnex)
      .where({channelId, signingAddress})
      .forUpdate()
      .first();

    if (ledgerProposal) {
      if (ledgerProposal.nonce < nonce && !ledgerProposal.proposal) {
        await LedgerProposal.query(txOrKnex)
          .where({channelId, signingAddress})
          .patch({proposal, nonce});
      } else {
        // do nothing
      }
    } else
      await LedgerProposal.query(txOrKnex).insert({
        channelId,
        signingAddress,
        proposal,
        nonce,
      });
  }
}
