import {
  ChannelConstants,
  Participant,
  SignatureEntry,
  SignedStateVarsWithHash,
  SignedStateWithHash,
  calculateChannelId,
  Zero,
  Address,
  toNitroState,
  SignedState,
  Uint256,
  checkThat,
  isSimpleAllocation,
  BN,
  unreachable,
} from '@statechannels/wallet-core';
import {JSONSchema, Model, Pojo, QueryContext, ModelOptions, TransactionOrKnex} from 'objection';
import {ChannelResult, FundingStrategy} from '@statechannels/client-api-schema';
import _ from 'lodash';
import {hashState} from '@statechannels/wasm-utils';
import {BigNumber} from 'ethers';

import {Bytes32, Uint48} from '../type-aliases';
import {
  ChannelState,
  toChannelResult,
  ChannelStateFunding,
  directFundingStatus,
} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';
import {dropNonVariables} from '../state-utils';
import {validateTransition} from '../utilities/validate-transition';

import {SigningWallet} from './signing-wallet';
import {Funding} from './funding';
import {ObjectiveModel} from './objective';
import {LedgerRequest} from './ledger-request';
import {ChainServiceRequest} from './chain-service-request';
import {AdjudicatorStatusModel} from './adjudicator-status';

export const REQUIRED_COLUMNS = [
  'chainId',
  'appDefinition',
  'channelNonce',
  'challengeDuration',
  'participants',
  'vars',
  'fundingStrategy',
] as const;
export const OPTIONAL_COLUMNS = ['assetHolderAddress', 'fundingLedgerChannelId'] as const;
export const COMPUTED_COLUMNS = ['channelId', 'signingAddress'] as const;

export const CHANNEL_COLUMNS = [...REQUIRED_COLUMNS, ...COMPUTED_COLUMNS, ...OPTIONAL_COLUMNS];

export interface RequiredColumns {
  readonly chainId: Bytes32;
  readonly appDefinition: Address;
  readonly channelNonce: Uint48;
  readonly challengeDuration: Uint48;
  readonly participants: Participant[];
  readonly vars: SignedStateVarsWithHash[];
  readonly signingAddress: Address;
  readonly fundingStrategy: FundingStrategy;
}

export type ComputedColumns = {
  readonly channelId: Bytes32;
};

type ChannelColumns = RequiredColumns & ComputedColumns;

export class Channel extends Model implements ChannelColumns {
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
  readonly adjudicatorStatus!: AdjudicatorStatusModel;
  readonly chainServiceRequests!: ChainServiceRequest[];
  readonly fundingStrategy!: FundingStrategy;

  readonly assetHolderAddress!: string; // only Ledger channels have this
  readonly fundingLedgerChannelId!: Bytes32; // only App channels funded by Ledger have this

  readonly initialSupport!: SignedState[];

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: [...REQUIRED_COLUMNS],
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
    adjudicatorStatus: {
      relation: Model.HasOneRelation,
      modelClass: AdjudicatorStatusModel,
      join: {from: 'channels.channelId', to: 'adjudicator_status.channelId'},
    },
    objectivesChannels: {
      relation: Model.ManyToManyRelation,
      modelClass: ObjectiveModel,
      join: {
        from: 'channels.channelId',
        through: {
          from: 'objectives_channels.channelId',
          to: 'objectives_channels.objectiveId',
        },
        to: 'objectives.objectiveId',
      },
    },
    chainServiceRequests: {
      relation: Model.HasManyRelation,
      modelClass: ChainServiceRequest,
      join: {
        from: 'channels.channelId',
        to: 'chain_service_requests.channelId',
      },
    },
  };

  static jsonAttributes = ['vars', 'participants', 'initialSupport'];

  static async forId(channelId: Bytes32, txOrKnex: TransactionOrKnex): Promise<Channel> {
    return Channel.query(txOrKnex)
      .where({channelId})
      .withGraphFetched('signingWallet')
      .withGraphFetched('funding')
      .withGraphFetched('chainServiceRequests')
      .withGraphFetched('adjudicatorStatus')
      .first();
  }
  // CHALLENGING_V0 temporary method
  static async setInitialSupport(
    channelId: string,
    support: SignedState[],
    txOrKnex: TransactionOrKnex
  ): Promise<void> {
    await Channel.query(txOrKnex).findOne({channelId}).patch({initialSupport: support});
  }

  static async setLedger(
    channelId: Bytes32,
    assetHolderAddress: Address,
    txOrKnex: TransactionOrKnex
  ): Promise<void> {
    await Channel.query(txOrKnex).findOne({channelId}).patch({assetHolderAddress});
  }

  static async isLedger(channelId: Bytes32, txOrKnex: TransactionOrKnex): Promise<boolean> {
    return !!(await Channel.query(txOrKnex)
      .whereNotNull('assetHolderAddress')
      .findOne({channelId}));
  }

  static getLedgerChannels(
    assetHolderAddress: string,
    participants: Participant[],
    txOrKnex: TransactionOrKnex
  ): Promise<Channel[]> {
    return Channel.query(txOrKnex)
      .select()
      .where({assetHolderAddress, participants: JSON.stringify(participants)});
  }

  static allChannelsWithPendingLedgerRequests(txOrKnex: TransactionOrKnex): Promise<Channel[]> {
    return txOrKnex.transaction(async trx => {
      return Channel.query(trx)
        .select()
        .whereIn(
          'channelId',
          (await LedgerRequest.getAllPendingRequests(trx)).map(l => l.channelToBeFunded)
        );
    });
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
    // Prevent extraneous fields from being stored
    this.vars = this.vars.map(sv => dropNonVariables(sv));

    this.vars.map(sv => {
      const correctHash = hashState(toNitroState({...this.channelConstants, ...sv}));
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
    const {
      channelId,
      myIndex,
      supported,
      latest,
      latestSignedByMe,
      support,
      participants,
      chainServiceRequests,
      fundingStrategy,
      fundingLedgerChannelId,
    } = this;
    const funding = (assetHolder: Address): ChannelStateFunding | undefined => {
      const noFunding = {amount: Zero, transferredOut: []};
      if (!this.funding) return undefined; // funding hasn't been fetched from db
      const result = this.funding.find(f => f.assetHolder === assetHolder);
      return result ? {amount: result.amount, transferredOut: result.transferredOut} : noFunding;
    };
    // directFundingStatus will return 'Uncategorized' e.g. if there's no supported outcome, even if
    // the funding hasn't been fetched. By checking for funding here too, we make it so that it
    // always returns undefined if the funding hasn't been fetched.
    const dfs = this.funding
      ? directFundingStatus(supported, funding, participants[myIndex], fundingStrategy)
      : undefined;

    return {
      myIndex: myIndex as 0 | 1,
      participants,
      channelId,
      supported,
      support,
      latest,
      latestSignedByMe,
      funding,
      chainServiceRequests: chainServiceRequests ?? [],
      fundingStrategy,
      fundingLedgerChannelId,
      directFundingStatus: dfs,
      adjudicatorStatus: this.adjudicatorStatus?.toResult().channelMode ?? 'Open',
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

  public get sortedStates(): Array<SignedStateWithHash> {
    return this.vars
      .map(s => ({...this.channelConstants, ...s}))
      .sort((s1, s2) => s2.turnNum - s1.turnNum);
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

  public get isLedger(): boolean {
    return !!this.assetHolderAddress;
  }
  public get isNullApp(): boolean {
    return BigNumber.from(this.channelConstants.appDefinition).isZero();
  }

  public get isAppChannel(): boolean {
    return !this.isLedger;
  }

  public get isRunning(): boolean {
    // running if:
    //  1. the supported state implies a post-fund-setup
    //  2. no isFinal states exist

    const noFinalStates = _.every(this.sortedStates, s => !s.isFinal);

    return this.postFundComplete && noFinalStates;
  }

  /**
   * Have we signed a prefund state (or later)
   */
  public get prefundSigned(): boolean {
    // all states are later than the prefund, so we just check if we've signed any state
    return !!this.latestSignedByMe;
  }

  /**
   * Have we signed a postfund state (or later)
   */
  public get postfundSigned(): boolean {
    return !!this.latestSignedByMe && this.latestSignedByMe.turnNum >= 2 * this.nParticipants - 1;
  }

  /**
   * Have all participants signed a consistent preFund state?
   */
  public get preFundComplete(): boolean {
    // The existence of any supported state implies a supported prefund state
    // which implies a full set (nParticipants) of consistent preFund signatures has been seen
    // (since no state is earlier than a prefund state).
    return !!this.supported;
  }

  /**
   * Have all participants signed a consistent postFund state?
   */
  public get postFundComplete(): boolean {
    // The existence of a supported state with sufficiently high turnNum
    // (at least the highest postFund state)
    // implies a full set (nParticipants) of consistent postFund signatures has been seen.
    return !!this.supported && this.supported.turnNum >= 2 * this.nParticipants - 1;
  }

  // Does the channel have funds to pay out to all allocation items?
  public get isFullyDirectFunded(): boolean {
    return this.isDirectFunded('FullyFunded');
  }

  // Does the channel have any funds that I can claim?
  public get isPartlyDirectFunded(): boolean {
    return this.isDirectFunded('PartlyFunded');
  }

  private isDirectFunded(threshold: 'FullyFunded' | 'PartlyFunded'): boolean {
    const outcome = this.supported?.outcome;
    if (!outcome) {
      throw new Error(`Channel passed to isDirectFunded has no supported state`);
    }

    const {assetHolderAddress, allocationItems} = checkThat(outcome, isSimpleAllocation);
    const channelFunds = this.funding.find(f => f.assetHolder === assetHolderAddress);
    if (!channelFunds) return false;

    switch (threshold) {
      case 'FullyFunded': {
        const fullFunding = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));
        return BN.gte(channelFunds.amount, fullFunding);
      }
      case 'PartlyFunded': {
        const fundingBeforeMe = this.fundingMilestones.targetBefore;
        return BN.gt(channelFunds.amount, fundingBeforeMe);
      }
      default:
        unreachable(threshold);
    }
  }

  /**
   * Returns a triple of balance [targetBefore, targetAfter, targetTotal], where
   *  - targetBefore is the balance where I should start depositing
   *  - targetAfter should be the balance where I stop depositing
   *  - targetTotal is the total amount that should be in the channel
   *
   * @param channel
   */
  public get fundingMilestones(): {
    targetBefore: Uint256;
    targetAfter: Uint256;
    targetTotal: Uint256;
  } {
    /**
     * The below logic assumes:
     *  1. Each destination occurs at most once.
     *  2. We only care about a single destination.
     * One reason to drop (2), for instance, is to support ledger top-ups with as few state updates as possible.
     */
    const supported = this.supported;
    if (!supported) {
      throw new Error(`Channel passed to DriectFunder has no supported state`);
    }

    const myDestination = this.participants[this.myIndex].destination;
    const {allocationItems} = checkThat(supported.outcome, isSimpleAllocation);

    const myAllocationItem = _.find(allocationItems, ai => ai.destination === myDestination);
    if (!myAllocationItem) {
      throw new Error(`My destination ${myDestination} is not in allocations ${allocationItems}`);
    }

    const allocationsBefore = _.takeWhile(allocationItems, a => a.destination !== myDestination);
    const targetBefore = allocationsBefore.map(a => a.amount).reduce(BN.add, BN.from(0));

    const targetAfter = BN.add(targetBefore, myAllocationItem.amount);

    const targetTotal = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));

    return {targetBefore, targetAfter, targetTotal};
  }

  private mySignature(signatures: SignatureEntry[]): boolean {
    return signatures.some(sig => sig.signer === this.myAddress);
  }

  get nParticipants(): number {
    return this.participants.length;
  }

  private get _support(): Array<SignedStateWithHash> {
    // TODO: activate these fields for proper application checks (may be resource hungry)
    const logger = undefined;
    const byteCode = undefined;
    const skipAppTransition = !this.isNullApp; // i.e. perform the check for null apps
    // It will return false because bytecode is i) undefined or ii) zero for null apps

    let support: Array<SignedStateWithHash> = [];

    let participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
    let previousState;

    for (const signedState of this.sortedStates) {
      // If there is not a valid transition we know there cannot be a valid support
      // so we clear out what we have and start at the current signed state

      if (
        previousState &&
        !validateTransition(signedState, previousState, logger, byteCode, skipAppTransition)
      ) {
        support = [];
        participantsWhoHaveNotSigned = new Set(this.participants.map(p => p.signingAddress));
      }
      const moverIndex = signedState.turnNum % this.nParticipants;
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

  public get otherParticipants(): Participant[] {
    return this.participants.filter((_, index) => index !== this.myIndex);
  }

  public get myParticipantId(): string {
    return this.participants[this.myIndex].participantId;
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isChannelError(err: any): err is ChannelError {
  if (err.type === WalletError.errors.ChannelError) return true;
  return false;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isChannelMissingError(err: any): err is ChannelError {
  if (isChannelError(err) && err.reason === ChannelError.reasons.channelMissing) {
    return true;
  }
  return false;
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
