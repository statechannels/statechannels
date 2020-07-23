import {JSONSchema, Model, Pojo, ModelOptions} from 'objection';
import {ethers} from 'ethers';

import {Address, Uint48} from '../type-aliases';
import knex from '../db/connection';

export class Nonce extends Model {
  readonly id!: number;
  readonly addresses!: Address[];
  readonly value!: Uint48;

  static tableName = 'nonces';
  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['addresses'],
    };
  }

  $beforeValidate(jsonSchema: JSONSchema, json: Pojo, _opt: ModelOptions): Pojo {
    super.$beforeValidate(jsonSchema, json, _opt);

    const {addresses} = json;

    if (!Array.isArray(addresses)) {
      throw new NonceError('Addresses are not an array', {addresses});
    }

    const notAddr = addresses.find(addr => !isAddress(addr));
    if (notAddr) throw new NonceError('Not an address', {notAddr});

    return json;
  }

  static async next(addresses: Address[]): Promise<number> {
    const insertQuery = knex('nonces').insert({addresses});

    return Nonce.knex()
      .raw(
        `
      ${insertQuery} ON CONFLICT (addresses)
      DO UPDATE SET value = nonces.value + 1
      RETURNING value `
      )
      .then(res => res.rows[0].value);
  }

  async use(): Promise<void> {
    const {rows} = await Nonce.knex().raw(
      `
        ${Nonce.knexQuery().insert(this)}
        ON CONFLICT (addresses) DO UPDATE
        SET value = EXCLUDED.value WHERE EXCLUDED.value > NONCES.value
        RETURNING NONCES.value
      `
    );

    if (typeof rows[0]?.value === 'number') {
      return rows[0].value;
    } else {
      throw new NonceError('Nonce too low -- ask for a new nonce');
    }
  }
}

class NonceError extends Error {
  readonly type = 'NonceError';

  constructor(reason: string, public readonly data: any = undefined) {
    super(reason);
  }
}

const isAddress = ethers.utils.isAddress;
