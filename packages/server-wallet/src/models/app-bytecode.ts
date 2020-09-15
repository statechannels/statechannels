import {Model, TransactionOrKnex} from 'objection';

import {Address, Bytes32, Bytes} from '../type-aliases';

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
