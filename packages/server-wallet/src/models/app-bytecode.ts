import {Address} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';

import {Bytes32, Bytes} from '../type-aliases';

export interface RequiredColumns {
  readonly chainId: Bytes32;
  readonly appDefinition: Address;
  readonly appBytecode: Bytes;
}

export class AppBytecode extends Model implements RequiredColumns {
  readonly chainId!: Bytes32;
  readonly appDefinition!: Address;
  readonly appBytecode!: Bytes;

  static tableName = 'app_bytecode';
  static get idColumn(): string[] {
    return ['chain_id', 'app_definition'];
  }

  static async upsertBytecode(
    chainId: Bytes32,
    appDefinition: Address,
    appBytecode: Bytes32,
    txOrKnex: TransactionOrKnex
  ): Promise<void> {
    await txOrKnex.raw(
      `INSERT INTO ${this.tableName} 
     (chain_id,app_definition,app_bytecode) 
      values (?, ?, ?)
    ON CONFLICT (chain_id,app_definition) 
    DO UPDATE SET
      app_bytecode = EXCLUDED.app_bytecode;
    `,
      [chainId, appDefinition, appBytecode]
    );
  }

  static async getBytecode(
    chainId: Bytes32,
    appDefinition: Address,
    txOrKnex: TransactionOrKnex
  ): Promise<Bytes | undefined> {
    return (
      await AppBytecode.query(txOrKnex)
        .where({chainId, appDefinition})
        .first()
    )?.appBytecode;
  }
}
