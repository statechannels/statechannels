import Knex from 'knex';
import { JSONSchema, Model, Pojo, ModelOptions } from 'objection';
import { ethers } from 'ethers';
import { Address } from '@statechannels/wallet-core';

import { Uint48 } from '../type-aliases';
import { WalletError, Values } from '../errors/wallet-error';

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

    const { addresses } = json;

    if (!Array.isArray(addresses)) {
      throw new NonceError(NonceError.reasons.addressNotInArray, { addresses });
    }

    const notAddr = addresses.find(addr => !isAddress(addr));
    if (notAddr) throw new NonceError(NonceError.reasons.notAnAddress, { notAddr });

    return json;
  }

  static async next(knex: Knex, addresses: Address[]): Promise<number> {
    const insertQuery = knex('nonces').insert({ addresses });

    return knex
      .raw(
        `
      ${insertQuery} ON CONFLICT (addresses)
      DO UPDATE SET value = nonces.value + 1
      RETURNING value `
      )
      .then(res => res.rows[0].value);
  }

  static async ensureLatest(value: Uint48, addresses: Address[], knex: Knex): Promise<void> {
    await Nonce.fromJson({ value, addresses }).use(knex);
  }

  async use(knex: Knex): Promise<void> {
    return await knex
      .raw(
        `
        ${knex('nonces').insert(this)}
        ON CONFLICT (addresses) DO UPDATE
        SET value = GREATEST(EXCLUDED.value, nonces.value)
        RETURNING value
      `
      )
      .then(res => res.rows[0].value);
  }
}

class NonceError extends WalletError {
  readonly type = WalletError.errors.NonceError;
  static readonly reasons = {
    addressNotInArray: 'Addresses are not an array',
    notAnAddress: 'Not an address',
    nonceTooLow: 'Nonce too low -- ask for a new nonce',
  } as const;

  constructor(reason: Values<typeof NonceError.reasons>, public readonly data: any = undefined) {
    super(reason);
  }
}

const isAddress = ethers.utils.isAddress;
