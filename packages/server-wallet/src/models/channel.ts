import { Model, QueryContext } from 'objection';
import {
  outcomesEqual,
  hashState,
  createSignatureEntry,
  SignedStateVarsWithHash,
  SignedStateVariables,
  Participant,
  StateVariablesWithHash,
  ChannelConstants,
  SignedState,
  StateVariables,
  SignatureEntry,
  SignedStateWithHash,
  calculateChannelId,
} from '@statechannels/wallet-core';
import _ from 'lodash';

import { logger } from '../logger';
import { Bytes32, Address, Uint48 } from '../type-aliases';
import { SigningWallet } from './signing-wallet';

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
export interface RequiredColumns
  extends Record<keyof typeof REQUIRED_COLUMNS, any> {
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

  readonly channelId: Bytes32;
  readonly chainId: Bytes32;
  readonly appDefinition: Address;
  readonly channelNonce: Uint48;
  readonly challengeDuration: Uint48;
  readonly participants: Participant[];
  readonly signingAddress: Address;
  readonly vars: SignedStateVarsWithHash[];

  readonly signingWallet!: SigningWallet;

  static get jsonSchema() {
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
  };

  static jsonAttributes = ['vars', 'participants'];

  static forId(channelId: Bytes32, tx): Promise<Channel> {
    return Channel.query(tx)
      .where({ channelId })
      .withGraphFetched('signingWallet')
      .first();
  }

  $toDatabaseJson() {
    // TODO: This seems unnecessary
    return _.pick(super.$toDatabaseJson(), Object.keys(CHANNEL_COLUMNS));
  }

  $beforeValidate(jsonSchema, json, _opt) {
    super.$beforeValidate(jsonSchema, json, _opt);

    return jsonSchema;
  }

  $beforeInsert(ctx: QueryContext) {
    super.$beforeInsert(ctx);
    const correctChannelId = calculateChannelId(this.channelConstants);
    (this.channelId as any) = this.channelId ?? correctChannelId;

    if (this.channelId !== correctChannelId) {
      throw new ChannelError(Errors.invalidChannelId, {
        given: this.channelId,
        correctChannelId,
      });
    }

    this.vars.map(sv => {
      const correctHash = hashState({ ...this.channelConstants, ...sv });
      sv.stateHash = sv.stateHash ?? correctHash;
      if (sv.stateHash !== correctHash) {
        throw new ChannelError(Errors.incorrectHash, {
          given: sv.stateHash,
          correctHash,
        });
      }
    });
  }

  // Modifiers
  signState(hash: Bytes32) {
    const state = this.signedStates.find(s => s.stateHash === hash);
    if (!state) {
      throw 'State not found';
    } else {
      return this.addState(state, this.signingWallet.signState(state));
    }
  }

  signAndAdd(stateVars: StateVariables, privateKey: string): SignedState {
    if (
      this.isSupportedByMe &&
      this.latestSignedByMe.turnNum >= stateVars.turnNum
    ) {
      logger.error({ entry: this.channelId, stateVars }, Errors.staleState);
      throw Error(Errors.staleState);
    }

    const state = { ...this.channelConstants, ...stateVars };

    const signatureEntry = createSignatureEntry(state, privateKey);

    return this.addState(stateVars, signatureEntry);
  }

  addState(
    stateVars: StateVariables,
    signatureEntry: SignatureEntry
  ): SignedState {
    const signedStateVars: SignedStateVariables = {
      ...stateVars,
      signatures: [signatureEntry],
    };
    const stateHash = hashState(this.state(signedStateVars));
    const withHash: StateVariablesWithHash = { ...stateVars, stateHash };

    const { participants } = this.channelConstants;

    // check the signature

    const signerIndex = participants.findIndex(
      p => p.signingAddress === signatureEntry.signer
    );
    let entry = this.vars.find(s => s.stateHash === withHash.stateHash);

    if (!entry) {
      entry = { ...withHash, signatures: [] };
      this.vars.push(entry);
    }

    if (signerIndex === -1) {
      throw new Error('State not signed by a participant of this channel');
    }

    entry.signatures = _.uniqWith(
      _.concat(entry.signatures, signatureEntry),
      _.isEqual
    );
    this.clearOldStates();
    this.checkInvariants();

    return this.state(entry);
  }

  // Computed
  get myIndex(): number {
    return this.participants.findIndex(
      p => p.signingAddress === this.signingAddress
    );
  }

  public get channelConstants(): ChannelConstants {
    const {
      channelNonce,
      challengeDuration,
      chainId,
      participants,
      appDefinition,
    } = this;
    return {
      channelNonce,
      challengeDuration,
      chainId,
      participants,
      appDefinition,
    };
  }

  public get sortedStates() {
    return this.vars.map(s => ({ ...this.channelConstants, ...s }));
  }

  public get myAddress(): Address {
    return this.participants[this.myIndex].signingAddress;
  }

  public get myTurn(): boolean {
    return (
      (this.supported.turnNum + 1) % this.participants.length === this.myIndex
    );
  }

  get isSupported() {
    return !!this._supported;
  }

  public get support(): Array<SignedState> {
    return this._support.map(s => ({ ...this.channelConstants, ...s }));
  }

  get hasConclusionProof() {
    return this.isSupported && this.support.every(s => s.isFinal);
  }

  get supported(): SignedStateWithHash | undefined {
    const vars = this._supported;
    if (vars) return { ...this.channelConstants, ...vars };
    else return undefined;
  }

  get isSupportedByMe() {
    return !!this._latestSupportedByMe;
  }
  get latestSignedByMe() {
    return this._latestSupportedByMe
      ? { ...this.channelConstants, ...this._latestSupportedByMe }
      : undefined;
  }

  get latest() {
    return this.signedStates[0]
      ? { ...this.channelConstants, ...this.signedStates[0] }
      : undefined;
  }

  private get _supported() {
    const latestSupport = this._support;
    return latestSupport.length === 0 ? undefined : latestSupport[0];
  }
  private state(stateVars: SignedStateVariables): SignedState {
    return { ...this.channelConstants, ...stateVars };
  }

  private get _signedByMe() {
    return this.signedStates.filter(s => this.mySignature(s.signatures));
  }

  private get _latestSupportedByMe() {
    return this._signedByMe[0];
  }

  private clearOldStates() {
    (this.vars as any) = _.reverse(_.sortBy(this.vars, s => s.turnNum));
    // If we don't have a supported state we don't clean anything out
    if (this.isSupported) {
      // The support is returned in descending turn number so we need to grab the last element to find the earliest state
      const { stateHash: firstSupportStateHash } = this._support[
        this._support.length - 1
      ];

      // Find where the first support state is in our current state array
      const supportIndex = this.vars.findIndex(
        sv => sv.stateHash === firstSupportStateHash
      );
      // Take everything before that
      (this.vars as any) = this.vars.slice(0, supportIndex + 1);
    }
  }

  private checkInvariants() {
    const groupedByTurnNum = _.groupBy(this._signedByMe, s =>
      s.turnNum.toString()
    );
    const multipleSignedByMe = _.map(groupedByTurnNum, s => s.length)?.find(
      num => num > 1
    );

    if (multipleSignedByMe) {
      logger.error({ entry: this.channelId }, Errors.multipleSignedStates);

      throw Error(Errors.multipleSignedStates);
    }

    const { signedStates } = this;
    const turnNums = _.map(signedStates, s => s.turnNum);

    const duplicateTurnNums = turnNums.some((t, i) => turnNums.indexOf(t) != i);
    if (duplicateTurnNums) {
      logger.error({ signedStates }, Errors.duplicateTurnNums);
      throw Error(Errors.duplicateTurnNums);
    }
    if (!isReverseSorted(turnNums)) {
      logger.error({ signedStates: _.map(signedStates, s => s.turnNum) });
      throw Error(Errors.notSorted);
    }
  }

  private get signedStates(): Array<SignedStateWithHash> {
    return this.vars.map(s => ({ ...this.channelConstants, ...s }));
  }

  private mySignature(signatures: SignatureEntry[]): boolean {
    return signatures.some(sig => sig.signer === this.myAddress);
  }

  private nParticipants(): number {
    return this.participants.length;
  }

  private get _support(): Array<SignedStateWithHash> {
    let support: Array<SignedStateWithHash> = [];

    let participantsWhoHaveNotSigned = new Set(
      this.participants.map(p => p.signingAddress)
    );
    let previousState;

    for (const signedState of this.signedStates) {
      // If there is not a valid transition we know there cannot be a valid support
      // so we clear out what we have and start at the current signed state
      if (previousState && !this.validChain(signedState, previousState)) {
        support = [];
        participantsWhoHaveNotSigned = new Set(
          this.participants.map(p => p.signingAddress)
        );
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
  private validChain(
    firstState: SignedState,
    secondState: SignedState
  ): boolean {
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

function isReverseSorted(arr) {
  const len = arr.length - 1;
  for (let i = 0; i < len; ++i) {
    if (arr[i] < arr[i + 1]) {
      return false;
    }
  }
  return true;
}

export enum Errors {
  invalidChannelId = 'Invalid channel id',
  incorrectHash = 'Incorrect hash',
  duplicateTurnNums = 'multiple states with same turn number',
  notSorted = 'states not sorted',
  multipleSignedStates = 'Store signed multiple states for a single turn',
  staleState = 'Attempting to sign a stale state',
  channelMissing = 'No channel found with id.',
  channelFunded = 'Channel already funded.',
  channelLocked = 'Channel is locked',
  noBudget = 'No budget exists for domain. ',
  noAssetBudget = "This domain's budget does contain this asset",
  channelNotInBudget = "This domain's budget does not reference this channel",
  noDomainForChannel = 'No domain defined for channel',
  domainExistsOnChannel = 'Channel already has a domain.',
  budgetAlreadyExists = 'There already exists a budget for this domain',
  budgetInsufficient = 'Budget insufficient to reserve funds',
  amountUnauthorized = 'Amount unauthorized in current budget',
  cannotFindDestination = 'Cannot find destination for participant',
  cannotFindPrivateKey = 'Private key missing for your address',
  notInChannel = 'Attempting to initialize  channel as a non-participant',
  noLedger = 'No ledger exists with peer',
  amountNotFound = 'Cannot find allocation entry with destination',
  invalidNonce = 'Invalid nonce',
  invalidTransition = 'Invalid transition',
  invalidAppData = 'Invalid app data',
  emittingDuringTransaction = 'Attempting to emit event during transaction',
  notMyTurn = "Cannot update channel unless it's your turn",
}

class ChannelError extends Error {
  readonly type = 'ChannelError';
  constructor(reason: Errors, public readonly data = undefined) {
    super(reason);
  }
}
