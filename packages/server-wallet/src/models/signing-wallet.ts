import {JSONSchema, Model, Pojo, ModelOptions} from 'objection';
import {SignatureEntry, State, signState, StateWithHash} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {Address, Bytes32} from '../type-aliases';
import {Values} from '../errors/wallet-error';
import {signState as wasmSignState} from '../utilities/signatures';

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

  syncSignState(state: State): SignatureEntry {
    return {
      signer: this.address,
      signature: signState(state, this.privateKey),
    };
  }

  async signState(state: StateWithHash): Promise<SignatureEntry> {
    return {
      signer: this.address,
      signature: (await wasmSignState(state, this.privateKey)).signature,
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
