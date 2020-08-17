import {JSONSchema, Model, Pojo, ModelOptions} from 'objection';
import {SignatureEntry, State, signState} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {Address, Bytes32} from '../type-aliases';
import {Values} from '../errors/wallet-error';
import config from '../config';

export class SigningWallet extends Model {
  readonly id!: number;
  readonly privateKey!: Bytes32;
  readonly address!: Address;

  static tableName = 'signing_wallets';

  $beforeValidate(jsonSchema: JSONSchema, json: Pojo, _opt: ModelOptions): JSONSchema {
    super.$beforeValidate(jsonSchema, json, _opt);

    if (!json.address) {
      const {address} = new ethers.Wallet(json.privateKey);
      json.address = address;
    }

    return json;
  }

  $validate(json: Pojo): Pojo {
    super.$validate(json);

    const w = new ethers.Wallet(json.privateKey);
    if (w.address !== json.address) {
      throw new SigningWalletError(SigningWalletError.reasons.invalidAddress, {
        given: json.address,
        correct: w.address,
      });
    }

    return json;
  }

  signState(state: State): SignatureEntry {
    return {
      signer: this.address,
      signature: config.signStates ? signState(state, this.privateKey) : '0x',
    };
  }
}

class SigningWalletError extends Error {
  readonly type = 'SigningWalletError';
  static readonly reasons = {invalidAddress: 'Invalid address'} as const;

  constructor(
    reason: Values<typeof SigningWalletError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}
