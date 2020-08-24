import {
  ChannelConstants,
  Participant,
  SignatureEntry,
  SignedState,
  SignedStateVarsWithHash,
  SignedStateWithHash,
  calculateChannelId,
  hashState,
  outcomesEqual,
  Zero,
} from '@statechannels/wallet-core';
import {JSONSchema, Model, Pojo, QueryContext, Transaction, ModelOptions} from 'objection';
import _ from 'lodash';
import {ChannelResult} from '@statechannels/client-api-schema';

import {Address, Bytes32, Uint48} from '../type-aliases';
import {ChannelState, toChannelResult} from '../protocols/state';
import {NotifyApp} from '../protocols/actions';
import {WalletError, Values} from '../errors/wallet-error';

import {SigningWallet} from './signing-wallet';
import {Funding} from './funding';

export type SyncState = NotifyApp[];

export const REQUIRED_COLUMNS = {
  chainId: 'chainId',
  appDefinition: 'appDefinition',
  channelNonce: 'channelNonce',
  challengeDuration: 'challengeDuration',
  participants: 'participants',
  vars: 'vars',
};

export const COMPUTED_COLUMNS = {
  channelId: 'channelId',
  signingAddress: 'signingAddress',
};
export interface RequiredColumns {
  readonly chainId: Bytes32;
  readonly appDefinition: Address;
  readonly channelNonce: Uint48;
  readonly challengeDuration: Uint48;
  readonly participants: Participant[];
  readonly vars: SignedStateVarsWithHash[];
  readonly signingAddress: Address;
}

export type ComputedColumns = {
  readonly channelId: Bytes32;
};

export const CHANNEL_COLUMNS = {
  ...REQUIRED_COLUMNS,
  ...COMPUTED_COLUMNS,
};

export class Channel extends Model implements RequiredColumns {
  readonly id!: number;

  channelId!: Bytes32;
  vars!: SignedStateVarsWithHash[];

  readonly chainId!: Bytes32;
  readonly appDefinition!: Address;
  readonly channelNonce!: Uint48;
  readonly challengeDuration!: Uint48;
  readonly participants!: Participant[];
  readonly signingAddress!: Address;

  readonly signingWallet!: SigningWallet;
  readonly funding!: Funding[];

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: Object.keys(REQUIRED_COLUMNS),
      properties: {
        chainId: {
          type: 'string',
        },
      },
    };
  }

  static tableName = 'channels';

  static relationMappings = {
    signingWallet: {
      relation: Model.BelongsToOneRelation,
      modelClass: SigningWallet,
      join: {
        from: 'channels.signingAddress',
        to: 'signing_wallets.address',
      },
    },
    funding: {
      relation: Model.HasManyRelation,
      modelClass: Funding,
      join: {
        from: 'channels.channelId',
        to: 'funding.channelId',
      },
    },
  };

  static jsonAttributes = ['vars', 'participants'];

  static async forId(channelId: Bytes32, tx: Transaction | undefined): Promise<Channel> {
    const result = Channel.query(tx)
      .where({channelId})
      .withGraphFetched('signingWallet')
      .withGraphFetched('funding')
      .first();

    if (!result) throw new ChannelError(ChannelError.reasons.channelMissing, {channelId});

    return result;
  }

  $toDatabaseJson(): Pojo {
    // TODO: This seems unnecessary
    return _.pick(super.$toDatabaseJson(), Object.keys(CHANNEL_COLUMNS));
  }

  $beforeValidate(jsonSchema: JSONSchema, json: Pojo, _opt: ModelOptions): JSONSchema {
    super.$beforeValidate(jsonSchema, json, _opt);

    return jsonSchema;
  }

  $beforeInsert(ctx: QueryContext): void {
    super.$beforeInsert(ctx);
    const correctChannelId = calculateChannelId(this.channelConstants);

    this.channelId = this.channelId ?? correctChannelId;

    if (this.channelId !== correctChannelId) {
      throw new ChannelError(ChannelError.reasons.invalidChannelId, {
        given: this.channelId,
        correctChannelId,
      });
    }

    this.vars.map(sv => {
      const correctHash = hashState({...this.channelConstants, ...sv});
      sv.stateHash = sv.stateHash ?? correctHash;
      if (sv.stateHash !== correctHash) {
        throw new ChannelError(ChannelError.reasons.incorrectHash, {
          given: sv.stateHash,
          correctHash,
        });
      }
    });
  }

  get protocolState(): ChannelState {
    const {channelId, myIndex, supported, latest, latestSignedByMe, support, participants} = this;
    const funding = (assetHolder: Address): string => {
      const result = this.funding.find(f => f.assetHolder === assetHolder);
      return result ? result.amount : Zero;
    };
    return {
      myIndex: myIndex as 0 | 1,
      participants,
      channelId,
      supported,
      support,
      latest,
      latestSignedByMe,
      funding,
    };
  }

  get channelResult(): ChannelResult {
    return toChannelResult(this.protocolState);
  }

  // Computed
  get myIndex(): number {
    return this.participants.findIndex(p => p.signingAddress === this.signingAddress);
  }

  public get channelConstants(): ChannelConstants {
    const {channelNonce, challengeDuration, chainId, participants, appDefinition} = this;
    return {
      channelNonce,
      challengeDuration,
      chainId,
      participants,
      appDefinition,
    };
  }

  public get sortedStates(): SignedStateVarsWithHash[] {
    return this.vars.map(s => ({...this.channelConstants, ...s}));
  }

  public get myAddress(): Address {
    return this.participants[this.myIndex].signingAddress;
  }

  public get myTurn(): boolean {
    if (this.supported) {
      return (this.supported.turnNum + 1) % this.participants.length === this.myIndex;
    } else {
      return this.myIndex === 0;
    }
  }

  get isSupported(): boolean {
    return !!this._supported;
  }

  public get support(): Array<SignedStateWithHash> {
    return this._support.map(s => ({...this.channelConstants, ...s}));
  }

  get hasConclusionProof(): boolean {
    return this.isSupported && this.support.every(s => s.isFinal);
  }

  get supported(): SignedStateWithHash | undefined {
    const vars = this._supported;
    if (vars) return {...this.channelConstants, ...vars};
    else return undefined;
  }

  get isSupportedByMe(): boolean {
    return !!this._latestSupportedByMe;
  }

  get latestSignedByMe(): SignedStateWithHash | undefined {
    return this._latestSupportedByMe
      ? {...this.channelConstants, ...this._latestSupportedByMe}
      : undefined;
  }

  get latest(): SignedStateWithHash {
    return {...this.channelConstants, ...this.signedStates[0]};
  }

  private get _supported(): SignedStateWithHash | undefined {
    const latestSupport = this._support;
    return latestSupport.length === 0 ? undefined : latestSupport[0];
  }

  public get signedByMe(): SignedStateWithHash[] {
    return this.signedStates.filter(s => this.mySignature(s.signatures));
  }

  private get _latestSupportedByMe(): SignedStateWithHash {
    return this.signedByMe[0];
  }

  public get signedStates(): Array<SignedStateWithHash> {
    return this.vars.map(s => ({...this.channelConstants, ...s}));
  }

  private mySignature(signatures: SignatureEntry[]): boolean {
    return signatures.some(sig => sig.signer === this.myAddress);
  }

  private nParticipants(): number {
    return this.participants.length;
  }

  private get _support(): Array<SignedStateWithHash> {
    let support: Array<SignedStateWithHash> = [];

    let participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
    let previousState;

    for (const signedState of this.signedStates) {
      // If there is not a valid transition we know there cannot be a valid support
      // so we clear out what we have and start at the current signed state
      if (previousState && !this.validChain(signedState, previousState)) {
        support = [];
        participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
      }
      const moverIndex = signedState.turnNum % this.nParticipants();
      const moverForThisTurn = this.participants[moverIndex].signingAddress;

      // If the mover hasn't signed the state then we know it cannot be part of the support
      if (signedState.signatures.some(s => s.signer === moverForThisTurn)) {
        support.push(signedState);

        for (const signature of signedState.signatures) {
          participantsWhoHaveNotSigned.delete(signature.signer);
          if (participantsWhoHaveNotSigned.size === 0) {
            return support;
          }
        }
      }
      previousState = signedState;
    }
    return [];
  }
  // This is a simple check based on _requireValidTransition from NitroProtocol
  // We will eventually want to perform a proper validTransition check
  // but we will have to be careful where we do that to prevent eating up a ton of cpu
  private validChain(firstState: SignedState, secondState: SignedState): boolean {
    if (firstState.turnNum + 1 !== secondState.turnNum) {
      return false;
    }
    if (secondState.isFinal) {
      return outcomesEqual(firstState.outcome, secondState.outcome);
    }
    if (secondState.turnNum < 2 * this.nParticipants()) {
      return (
        outcomesEqual(firstState.outcome, secondState.outcome) &&
        firstState.appData === secondState.appData
      );
    }
    return true;
  }
}

export class ChannelError extends WalletError {
  readonly type = WalletError.errors.ChannelError;

  static readonly reasons = {
    invalidChannelId: 'Invalid channel id',
    incorrectHash: 'Incorrect hash',
    channelMissing: 'No channel found with id.',
  } as const;

  constructor(reason: Values<typeof ChannelError.reasons>, public readonly data: any = undefined) {
    super(reason);
  }
}
