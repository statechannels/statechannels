import {Model} from 'objection';
import Knex from 'knex';

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
    knex: Knex,
    chainId: Bytes32,
    appDefinition: Address
  ): Promise<Bytes | undefined> {
    return (
      await AppBytecode.query(knex)
        .where({chainId, appDefinition})
        .first()
    )?.appBytecode;
  }
}
