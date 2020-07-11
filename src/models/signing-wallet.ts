import { Model } from 'objection';
import { Address, Bytes32 } from '../type-aliases';
import { ethers } from 'ethers';
import { State, SignatureEntry, signState } from '@statechannels/wallet-core';

export class SigningWallet extends Model {
  readonly id!: number;
  readonly privateKey: Bytes32;
  readonly address: Address;

  static tableName = 'signing_wallets';

  $beforeValidate(jsonSchema, json, _opt) {
    super.$beforeValidate(jsonSchema, json, _opt);

    if (!json.address) {
      const { address } = new ethers.Wallet(json.privateKey);
      json.address = address;
    }

    return json;
  }

  $validate(json) {
    super.$validate(json);

    const w = new ethers.Wallet(json.privateKey);
    if (w.address !== json.address) {
      throw new SigningWalletError('Invalid address', {
        given: json.address,
        correct: w.address,
      });
    }

    return json;
  }

  signState(state: State): SignatureEntry {
    return {
      signer: this.address,
      signature: signState(state, this.privateKey),
    };
  }
}

class SigningWalletError extends Error {
  readonly type = 'SigningWalletError';

  constructor(reason: string, public readonly data = undefined) {
    super(reason);
  }
}
