import {Transaction, TransactionOrKnex, UniqueViolationError} from 'objection';
import {
  Objective,
  Outcome,
  SignedStateWithHash,
  SignedStateVarsWithHash,
  calculateChannelId,
  StateVariables,
  ChannelConstants,
  Participant,
  deserializeObjective,
  isOpenChannel,
  isCloseChannel,
  SignedState,
  isSimpleAllocation,
  checkThat,
  CloseChannel,
  OpenChannel,
  makePrivateKey,
  makeAddress,
  Address,
  PrivateKey,
  SubmitChallenge,
  isSubmitChallenge,
  DefundChannel,
} from '@statechannels/wallet-core';
import {Payload as WirePayload, SignedState as WireSignedState} from '@statechannels/wire-format';
import _ from 'lodash';
import {ChannelResult, FundingStrategy} from '@statechannels/client-api-schema';
import {ethers} from 'ethers';
import Knex from 'knex';
import {Logger} from 'pino';
import pMap from 'p-map';

import {Channel, ChannelError, CHANNEL_COLUMNS} from '../models/channel';
import {SigningWallet} from '../models/signing-wallet';
import {addHash, addState, clearOldStates, fastDeserializeState} from '../state-utils';
import {ChannelState} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';
import {Bytes32, Uint256, Bytes} from '../type-aliases';
import {timerFactory, recordFunctionMetrics, setupDBMetrics, timerFactorySync} from '../metrics';
import {isReverseSorted, pick} from '../utilities/helpers';
import {Funding, TransferredOutEntry} from '../models/funding';
import {Nonce} from '../models/nonce';
import {
  ObjectiveModel,
  DBObjective,
  DBCloseChannelObjective,
  DBOpenChannelObjective,
  DBSubmitChallengeObjective,
  DBDefundChannelObjective,
} from '../models/objective';
import {AppBytecode} from '../models/app-bytecode';
import {LedgerRequest, LedgerRequestType} from '../models/ledger-request';
import {shouldValidateTransition, validateTransition} from '../utilities/validate-transition';
import {defaultTestConfig} from '../config';
import {createLogger} from '../logger';
import {LedgerProposal} from '../models/ledger-proposal';
import {ChainServiceRequest} from '../models/chain-service-request';
import {AdjudicatorStatusModel} from '../models/adjudicator-status';

const defaultLogger = createLogger(defaultTestConfig());

export type AppHandler<T> = (tx: Transaction, channelRecord: Channel) => T;
export type MissingAppHandler<T> = (channelId: string) => T;

const throwMissingChannel: MissingAppHandler<any> = (channelId: string) => {
  throw new ChannelError(ChannelError.reasons.channelMissing, {channelId});
};

export class Store {
  readonly logger: Logger = defaultLogger;

  constructor(
    public readonly knex: Knex,
    readonly timingMetrics: boolean,
    readonly skipEvmValidation: boolean,
    readonly chainNetworkID: string,
    logger?: Logger
  ) {
    if (timingMetrics) {
      this.getOrCreateSigningAddress = recordFunctionMetrics(this.getOrCreateSigningAddress);
      this.lockApp = recordFunctionMetrics(this.lockApp);
      this.signState = recordFunctionMetrics(this.signState);
      this.getChannelState = recordFunctionMetrics(this.getChannelState);
      this.getStates = recordFunctionMetrics(this.getStates);
      this.getChannels = recordFunctionMetrics(this.getChannels);
      this.ensureObjective = recordFunctionMetrics(this.ensureObjective);
      this.pushMessage = recordFunctionMetrics(this.pushMessage);
      this.addSignedState = recordFunctionMetrics(this.addSignedState);

      setupDBMetrics(this.knex);
      if (logger) this.logger = logger;
    }
  }

  async addSigningKey(privateKey: PrivateKey): Promise<void> {
    await this.getOrCreateSigningAddress(new ethers.Wallet(privateKey));
  }

  async getOrCreateSigningAddress(wallet = ethers.Wallet.createRandom()): Promise<Address> {
    // signing_wallets table allows for only one row via database constraints
    try {
      // returning('*') only works with Postgres
      // https://vincit.github.io/objection.js/recipes/returning-tricks.html
      const signingWallet = await SigningWallet.query(this.knex)
        .insert({
          privateKey: makePrivateKey(wallet.privateKey),
          address: makeAddress(wallet.address),
        })
        .returning('*');
      return signingWallet.address;
    } catch (error) {
      if (error instanceof UniqueViolationError) {
        return (await SigningWallet.query(this.knex).first()).address;
      }
      throw error;
    }
  }

  /**
   * Ensure a channel is only update-able by some criticable code within a transaction.
   *
   * @param channelId application channel Id
   * @param criticalCode critical code to be executed while holding a lock on channelId
   * @param onChannelMissing An optional handler that is called when the channel cannot be found. Defaults to throwMissingChannel
   * @param fetchSigningWallet Whether the signing wallets for a channel should be fetched when querying for the channel. Defaults to false
   *
   * This excutes `criticalCode` within the context of a SQL transaction, after first acquiring a row-level
   * lock on a single row in the Channels table. This guarantees that at most one `criticalCode` can be
   * executing concurrently across all wallets.
   */
  async lockApp<T>(
    channelId: Bytes32,
    criticalCode: AppHandler<T>,
    onChannelMissing: MissingAppHandler<T> = throwMissingChannel,
    fetchSigningWallet = false
  ): Promise<T> {
    return this.knex.transaction(async tx => {
      const timer = timerFactory(this.timingMetrics, `lock app ${channelId}`);
      const channel = await timer('getting channel', () => {
        const query = Channel.query(tx).where({channelId}).forUpdate().first();

        if (fetchSigningWallet) return query.withGraphFetched('signingWallet');

        return query;
      });

      if (!channel) return onChannelMissing(channelId);
      return timer('critical code', async () => criticalCode(tx, channel));
    });
  }

  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.knex.transaction(async tx => callback(tx));
  }

  async signState(
    channel: Channel,
    vars: StateVariables,
    tx: Transaction // Insist on a transaction since addSignedState requires it
  ): Promise<SignedState> {
    const signingWallet =
      channel.signingWallet || (await channel.$relatedQuery('signingWallet', tx).first());

    if (!signingWallet) {
      throw new Error('No signing wallets');
    }
    const timer = timerFactory(this.timingMetrics, `signState ${channel.channelId}`);

    const state = addHash({...channel.channelConstants, ...vars});

    const {supported, latestSignedByMe} = channel;

    if (latestSignedByMe && latestSignedByMe.turnNum >= state.turnNum)
      // Don't sign a new state with lower turnNum than already signed by you
      throw new StoreError(StoreError.reasons.staleState);

    const signatureEntry = await timer('signing', async () => signingWallet.signState(state));
    const signedState = {...state, signatures: [signatureEntry]};

    if (supported && shouldValidateTransition(state, channel)) {
      const bytecode = await this.getBytecode(supported.appDefinition, tx);

      if (!this.skipEvmValidation && !bytecode)
        this.logger.error('Missing bytecode', {
          error: new Error(`No byte code for ${supported.appDefinition}`),
        });

      if (
        !(await timer('validating transition', async () =>
          validateTransition(supported, signedState, this.logger, bytecode, this.skipEvmValidation)
        ))
      ) {
        throw new StoreError('Invalid state transition', {
          from: channel.supported,
          to: signedState,
        });
      }
    }

    await timer('adding MY state', async () => this.addMyState(channel, signedState, tx));

    return signedState;
  }

  async addMyState(
    channel: Channel,
    signedState: SignedStateWithHash,
    tx: Transaction
  ): Promise<Channel> {
    if (
      signedState.signatures.length > 1 ||
      signedState.signatures[0].signer !== channel.myAddress
    ) {
      throw new Error('This state not exclusively signed by me');
    }

    const timer = timerFactory(this.timingMetrics, `addMyState ${channel.channelId}`);

    channel.vars = await timer('adding state', async () => addState(channel.vars, signedState));
    channel.vars = clearOldStates(channel.vars, channel.isSupported ? channel.support : undefined);

    await timer('validating invariants', async () =>
      validateInvariants(channel.vars, channel.myAddress)
    );

    const result = await timer('updating', async () =>
      Channel.query(tx)
        .where({channelId: channel.channelId})
        .patch({vars: channel.vars})
        .returning('*')
        .first()
    );

    return result;
  }

  async getChannelState(channelId: Bytes32, tx?: Transaction): Promise<ChannelState> {
    const channel = await this.getChannel(channelId, tx);

    // TODO: throwing here is a quick fix until we can update all consumers of getChannelState
    // to handle ChannelState | undefined
    if (!channel) throw new Error(`Channel not found with id ${channelId}`);

    return channel.protocolState;
  }

  async getChannel(channelId: Bytes32, tx?: Transaction): Promise<Channel | undefined> {
    // This is somewhat faster than Channel.forId for simply fetching a channel:
    // - the signingWallet isn't needed to construct the protocol state
    // - withGraphJoined is slightly faster in this case
    return Channel.query(tx ?? this.knex)
      .where({'channels.channel_id': channelId})
      .withGraphJoined('funding')
      .withGraphJoined('chainServiceRequests')
      .withGraphJoined('adjudicatorStatus')
      .first();
  }

  async getAndLockChannel(channelId: Bytes32, tx: Transaction): Promise<Channel | undefined> {
    return Channel.query(tx)
      .where({channelId})
      .withGraphJoined('adjudicatorStatus')
      .withGraphFetched('signingWallet')
      .forUpdate()
      .first();
  }

  async getStates(
    channelId: Bytes32,
    tx?: Transaction
  ): Promise<{states: SignedStateWithHash[]; channelState: ChannelState}> {
    const channel = await Channel.forId(channelId, tx || this.knex);

    if (!channel) throw new StoreError(StoreError.reasons.channelMissing);

    const {vars, channelConstants, protocolState: channelState} = channel;
    return {states: vars.map(ss => _.merge(ss, channelConstants)), channelState};
  }

  async getChannels(): Promise<ChannelState[]> {
    return (await Channel.query(this.knex)).map(channel => channel.protocolState);
  }

  /**
   * Returns all channels that are not finalized on chain
   */
  async getNonFinalizedChannels(): Promise<ChannelState[]> {
    return (await Channel.query(this.knex))
      .filter(c => !c.adjudicatorStatus || c.adjudicatorStatus.toResult().channelMode === 'Open')
      .map(channel => channel.protocolState);
  }

  async getLedgerChannels(
    assetHolderAddress: string,
    participants: Participant[]
  ): Promise<ChannelState[]> {
    const ledgers = await Channel.getLedgerChannels(assetHolderAddress, participants, this.knex);
    return ledgers.map(c => c.protocolState);
  }

  async pushMessage(
    message: WirePayload
  ): Promise<{
    channelIds: Bytes32[];
    channelResults: ChannelResult[];
  }> {
    return this.knex.transaction(async tx => {
      const channelResults: ChannelResult[] = [];

      // Sorted to ensure channel nonces arrive in ascending order
      const sortedSignedStates = _.sortBy(message.signedStates || [], a => a.channelNonce);

      const stateChannelIds = message.signedStates?.map(ss => ss.channelId) || [];
      for (const ss of sortedSignedStates || []) {
        const channel = await this.addSignedState(ss.channelId, ss, tx);
        channelResults.push(channel.channelResult);
      }

      const deserializedObjectives = message.objectives?.map(deserializeObjective) || [];
      const storedObjectives = [];
      for (const o of deserializedObjectives) {
        storedObjectives.push(await this.ensureObjective(o, tx));
      }

      const objectiveChannelIds = storedObjectives
        .filter(
          objective =>
            isSubmitChallenge(objective) || isOpenChannel(objective) || isCloseChannel(objective)
        )
        .map(objective => objective.data.targetChannelId);

      return {
        channelIds: stateChannelIds.concat(objectiveChannelIds),
        channelResults,
      };
    });
  }

  async getObjectives(channelIds: Bytes32[], tx?: Transaction): Promise<DBObjective[]> {
    return await ObjectiveModel.forChannelIds(channelIds, tx || this.knex);
  }

  async approveObjective(objectiveId: string, tx?: Transaction): Promise<void> {
    await ObjectiveModel.approve(objectiveId, tx || this.knex);
  }

  async markObjectiveStatus<O extends DBObjective>(
    objective: O,
    status: 'succeeded' | 'failed',
    tx?: Transaction
  ): Promise<O> {
    if (status === 'succeeded') {
      return (
        await ObjectiveModel.succeed(objective.objectiveId, tx || this.knex)
      ).toObjective() as O;
    } else {
      return (
        await ObjectiveModel.failed(objective.objectiveId, tx || this.knex)
      ).toObjective() as O;
    }
  }

  private bytecodeCache: Record<string, string | undefined> = {};
  async getBytecode(appDefinition: Address, tx: Transaction): Promise<Bytes | undefined> {
    return (
      this.bytecodeCache[appDefinition] ??
      (this.bytecodeCache[appDefinition] = await AppBytecode.getBytecode(
        this.chainNetworkID,
        appDefinition,
        tx
      ))
    );
  }

  async upsertBytecode(
    chainNetworkId: string,
    appDefinition: Address,
    bytecode: Bytes
  ): Promise<void> {
    await AppBytecode.upsertBytecode(chainNetworkId, appDefinition, bytecode, this.knex);
  }

  async getObjective(objectiveId: string, tx?: TransactionOrKnex): Promise<DBObjective> {
    tx = tx || this.knex; // TODO: make tx required
    return await ObjectiveModel.forId(objectiveId, tx);
  }

  /**
   * Ensure the provided objective is stored in the database.
   * Returns the objective as a DBObjective
   */
  async ensureObjective(objective: Objective, tx: Transaction): Promise<DBObjective> {
    switch (objective.type) {
      case 'OpenChannel':
        return this.ensureOpenChannelObjective(objective, tx);
      case 'CloseChannel':
        return this.ensureCloseChannelObjective(objective, tx);
      case 'SubmitChallenge':
        return this.ensureSubmitChallengeObjective(objective, tx);
      case 'DefundChannel':
        return this.ensureDefundChannelObjective(objective, tx);
      default:
        throw new StoreError(StoreError.reasons.unimplementedObjective);
    }
  }

  async ensureDefundChannelObjective(
    objective: DefundChannel,
    tx: Transaction
  ): Promise<DBDefundChannelObjective> {
    const {data} = objective;
    const {targetChannelId} = data;
    // fetch the channel to make sure the channel exists
    const channel = await this.getChannelState(targetChannelId, tx);
    if (!channel) {
      throw new StoreError(StoreError.reasons.channelMissing, {channelId: targetChannelId});
    }

    const objectiveToBeStored = {...objective, status: 'pending' as const};

    return ObjectiveModel.insert(objectiveToBeStored, tx) as Promise<DBDefundChannelObjective>;
  }

  async ensureSubmitChallengeObjective(
    objective: SubmitChallenge,
    tx: Transaction
  ): Promise<DBSubmitChallengeObjective> {
    const {data} = objective;
    const {targetChannelId} = data;
    // fetch the channel to make sure the channel exists
    const channel = await this.getChannelState(targetChannelId, tx);
    if (!channel) {
      throw new StoreError(StoreError.reasons.channelMissing, {channelId: targetChannelId});
    }

    const objectiveToBeStored = {
      ...objective,
      status: 'pending' as const,
    };

    return ObjectiveModel.insert(objectiveToBeStored, tx) as Promise<DBSubmitChallengeObjective>;
  }

  async ensureOpenChannelObjective(
    objective: OpenChannel,
    tx: Transaction
  ): Promise<DBOpenChannelObjective> {
    const {
      data: {targetChannelId: channelId, fundingStrategy, fundingLedgerChannelId, role},
    } = objective;

    // fetch the channel to make sure the channel exists
    const channel = await this.getChannelState(channelId, tx);
    if (!channel) {
      throw new StoreError(StoreError.reasons.channelMissing, {channelId});
    }

    if (!_.includes(['Ledger', 'Direct', 'Fake'], objective.data.fundingStrategy))
      throw new StoreError(StoreError.reasons.unimplementedFundingStrategy, {fundingStrategy});

    const objectiveToBeStored = {
      participants: [],
      status: 'pending' as const,
      type: objective.type,
      data: {
        fundingStrategy,
        fundingLedgerChannelId,
        targetChannelId: channelId,
        role,
      },
    };

    if (role === 'ledger')
      await Channel.setLedger(
        channelId,
        checkThat(channel.latest.outcome, isSimpleAllocation).assetHolderAddress,
        tx
      );

    await Channel.query(tx)
      .where({channelId: channel.channelId})
      .patch({fundingStrategy, fundingLedgerChannelId})
      .returning('*')
      .first();

    return ObjectiveModel.insert(objectiveToBeStored, tx) as Promise<DBOpenChannelObjective>;
  }

  async ensureCloseChannelObjective(
    objective: CloseChannel,
    tx: Transaction
  ): Promise<DBCloseChannelObjective> {
    const {
      data: {targetChannelId, fundingStrategy},
    } = objective;

    // fetch the channel to make sure the channel exists
    const channel = await this.getChannelState(targetChannelId, tx);
    if (!channel)
      throw new StoreError(StoreError.reasons.channelMissing, {
        channelId: targetChannelId,
      });

    const objectiveToBeStored = {
      status: 'approved' as const,
      type: objective.type,
      participants: [],
      data: {
        targetChannelId,
        fundingStrategy,
      },
    };

    return ObjectiveModel.insert(objectiveToBeStored, tx) as Promise<DBCloseChannelObjective>;
  }

  async isLedger(channelId: Bytes32, tx?: Transaction): Promise<boolean> {
    return Channel.isLedger(channelId, tx || this.knex);
  }

  async getLedgerRequest(
    channelId: Bytes32,
    type: 'fund' | 'defund',
    tx?: Transaction
  ): Promise<LedgerRequestType | undefined> {
    return LedgerRequest.getRequest(channelId, type, tx || this.knex);
  }

  async getChannelIdsPendingLedgerFundingFrom(
    ledgerChannelIds: Bytes32[],
    tx?: Transaction
  ): Promise<Bytes32[]> {
    const query = await LedgerRequest.query(tx || this.knex)
      .whereIn('ledgerChannelId', ledgerChannelIds)
      .where({status: 'pending'})
      .distinct('channelToBeFunded')
      .select('channelToBeFunded');

    return _.map(query, 'channelToBeFunded');
  }

  async getLedgerChannelIdsFundingChannels(
    channelToBeFunded: Bytes32[],
    tx?: Transaction
  ): Promise<Bytes32[]> {
    const query = await LedgerRequest.query(tx || this.knex)
      .whereIn('channelToBeFunded', channelToBeFunded)
      .where({status: 'pending'})
      .distinct('ledgerChannelId')
      .select('ledgerChannelId');

    return _.map(query, 'ledgerChannelId');
  }

  async filterChannelIdsByIsLedger(
    maybeLedgerChannelIds: Bytes32[],
    tx?: Transaction
  ): Promise<Bytes32[]> {
    const query = await Channel.query(tx || this.knex)
      .whereIn('channelId', maybeLedgerChannelIds)
      .whereNotNull('assetHolderAddress')
      .select('channelId');

    return _.map(query, 'channelId');
  }

  async getAllPendingLedgerRequests(tx?: Transaction): Promise<LedgerRequestType[]> {
    return LedgerRequest.getAllPendingRequests(tx || this.knex);
  }

  async getPendingLedgerRequests(
    ledgerChannelId: Bytes32,
    tx?: Transaction
  ): Promise<LedgerRequestType[] | undefined> {
    return LedgerRequest.getPendingRequests(ledgerChannelId, tx || this.knex);
  }

  async markLedgerRequests(
    channelIds: Bytes32[],
    type: 'fund' | 'defund',
    status: 'succeeded' | 'failed' | 'pending',
    tx?: TransactionOrKnex
  ): Promise<void> {
    await pMap(channelIds, request =>
      LedgerRequest.setRequestStatus(request, type, status, tx || this.knex)
    );
  }

  async getLedgerProposals(channelId: Bytes32, tx?: Transaction): Promise<LedgerProposal[]> {
    return await LedgerProposal.forChannel(channelId, tx || this.knex);
  }

  async storeLedgerProposal(
    channelId: Bytes32,
    proposal: Outcome,
    nonce: number,
    signingAddress: Address,
    tx?: Transaction
  ): Promise<void> {
    proposal = checkThat(proposal, isSimpleAllocation);
    await LedgerProposal.storeProposal(
      {channelId, proposal, nonce, signingAddress},
      tx || this.knex
    );
  }

  async removeLedgerProposals(channelId: Bytes32, tx: Transaction): Promise<void> {
    await LedgerProposal.setProposalsToNull(channelId, tx);
  }

  /**
   * Add a new state into the database.
   *
   * @param channelId - the channel ID the state refers to
   * @param state - the new signed state to be added
   * @param tx - an existing database transaction context
   *
   * This function serves as both a data validator (ensure the state is valid) and
   * an efficient operator on the database.
   */
  async addSignedState(
    channelId: string,
    wireState: WireSignedState,
    tx: Transaction
  ): Promise<Channel> {
    const syncTimer = timerFactorySync(this.timingMetrics, `add signed state ${channelId}`);
    const asyncTimer = timerFactory(this.timingMetrics, `add signed state ${channelId}`);

    // Deserialize (and throw if signer not a participant)
    const deserializedState = syncTimer('validating signatures', () =>
      fastDeserializeState(channelId, wireState)
    );

    // Compute the stateHash for the new state
    const state = addHash(deserializedState);

    // Get the Channel row from the database (create if needed)
    const channel =
      (await Channel.forId(channelId, tx)) ||
      (await createChannel(state, 'Unknown', undefined, tx));

    const {supported} = channel;
    if (supported && shouldValidateTransition(state, channel)) {
      const bytecode = await this.getBytecode(supported.appDefinition, tx);

      if (bytecode == undefined)
        this.logger.error('Missing bytecode', {
          error: new Error(`No byte code for ${supported.appDefinition}`),
        });

      const isValidTransition = syncTimer('validating transition', () =>
        validateTransition(supported, state, this.logger, bytecode, this.skipEvmValidation)
      );

      if (!isValidTransition) {
        throw new StoreError('Invalid state transition', {
          from: supported,
          to: state,
        });
      }
    }

    // Create the new Channel object by adding the new state
    channel.vars = syncTimer('adding state', () => addState(channel.vars, state));

    // Do 'garbage collection' by removing unnecessary / stale states
    channel.vars = clearOldStates(channel.vars, channel.isSupported ? channel.support : undefined);

    // Do checks on the Channel object before inserting into the database
    syncTimer('validating invariants', () => validateInvariants(channel.vars, channel.myAddress));

    // Insert into the DB
    return await asyncTimer('updating', () =>
      Channel.query(tx)
        .where({channelId: channel.channelId})
        .patch({vars: channel.vars})
        .returning('*')
        .first()
    );
  }

  async createChannel(
    constants: ChannelConstants,
    appData: Bytes,
    outcome: Outcome,
    fundingStrategy: FundingStrategy,
    role: 'app' | 'ledger' = 'app',
    fundingLedgerChannelId?: Bytes32
  ): Promise<{channel: ChannelState; firstSignedState: SignedState; objective: DBObjective}> {
    return await this.knex.transaction(async tx => {
      const channel = await createChannel(constants, fundingStrategy, fundingLedgerChannelId, tx);
      const {channelId, participants} = channel;
      const firstSignedState = await this.signState(
        channel,
        {
          ...constants,
          turnNum: 0,
          isFinal: false,
          appData,
          outcome,
        },
        tx
      );

      const objectiveParams = {
        type: 'OpenChannel' as const,
        participants,
        data: {
          targetChannelId: channelId,
          fundingStrategy,
          fundingLedgerChannelId,
          role,
        },
      };

      const objective = await this.ensureObjective(objectiveParams, tx);
      await this.approveObjective(objective.objectiveId, tx);

      return {channel: await this.getChannelState(channelId, tx), firstSignedState, objective};
    });
  }

  async setInitialSupport(
    channelId: string,
    support: SignedState[],
    tx?: Transaction
  ): Promise<void> {
    await Channel.setInitialSupport(channelId, support, tx ?? this.knex);
  }

  async updateFunding(
    channelId: string,
    fromAmount: Uint256,
    assetHolderAddress: Address
  ): Promise<void> {
    await Funding.updateFunding(this.knex, channelId, fromAmount, assetHolderAddress);
  }

  async insertAdjudicatorStatus(
    channelId: string,
    finalizedAt: number,
    states: SignedState[]
  ): Promise<void> {
    await AdjudicatorStatusModel.insertAdjudicatorStatus(this.knex, channelId, finalizedAt, states);
  }

  async markAdjudicatorStatusAsFinalized(
    channelId: string,
    blockNumber: number,
    blockTimestamp: number
  ): Promise<void> {
    await AdjudicatorStatusModel.setFinalized(this.knex, channelId, blockNumber, blockTimestamp);
  }

  async updateTransferredOut(
    channelId: string,
    assetHolder: Address,
    transferredOut: TransferredOutEntry[]
  ): Promise<void> {
    this.lockApp(channelId, tx =>
      Funding.updateTransferredOut(tx, channelId, assetHolder, transferredOut)
    );
  }

  async nextNonce(signingAddresses: Address[]): Promise<number> {
    return await Nonce.next(this.knex, signingAddresses);
  }

  async fundingRequestExists(channelId: string, tx: Transaction): Promise<boolean> {
    const request = await ChainServiceRequest.query(tx).where({channelId, request: 'fund'}).first();

    return !!request && request.isValid();
  }

  async getFunding(
    channelId: string,
    assetHolder: Address,
    tx: Transaction
  ): Promise<Funding | undefined> {
    const funding = Funding.query(tx).where({channelId, assetHolder}).first();

    return funding;
  }
}

class StoreError extends WalletError {
  readonly type = WalletError.errors.StoreError;

  static readonly reasons = {
    duplicateChannel: 'Expected the channel to NOT exist in the database',
    duplicateTurnNums: 'multiple states with same turn number',
    notSorted: 'states not sorted',
    multipleSignedStates: 'Store signed multiple states for a single turn',
    invalidSignature: 'Invalid signature',
    notInChannel: 'Not in channel',
    staleState: 'Stale state',
    missingSigningKey: 'Missing a signing key',
    invalidTransition: 'Invalid state transition',
    channelMissing: 'Channel not found',
    unimplementedObjective: 'Unimplemented objective',
    unimplementedFundingStrategy: 'Unimplemented funding strategy',
    invalidFundingLedgerChannelId: 'Ledger channel intended to fund channel does not exist',
    expiredFundingLedgerChannelId: 'Ledger channel intended to fund channel is closed or closing',
  } as const;
  constructor(reason: Values<typeof StoreError.reasons>, public readonly data: any = undefined) {
    super(reason);
  }
}

/**
 * Construct a new Channel and insert it into the database, ensuring that the Nonce
 * provided for this new channel is also the newest we have ever seen.
 */
async function createChannel(
  constants: ChannelConstants,
  fundingStrategy: FundingStrategy,
  fundingLedgerChannelId: Bytes32 | undefined,
  txOrKnex: TransactionOrKnex
): Promise<Channel> {
  if (fundingLedgerChannelId) {
    const ledger = await Channel.forId(fundingLedgerChannelId, txOrKnex);
    if (!ledger) throw new StoreError(StoreError.reasons.invalidFundingLedgerChannelId);
    if (ledger.supported && _.some(ledger.support, 'isFinal'))
      throw new StoreError(StoreError.reasons.expiredFundingLedgerChannelId);
  }

  const addresses = constants.participants.map(p => p.signingAddress);

  const signingWallet = await SigningWallet.query(txOrKnex).whereIn('address', addresses).first();

  if (!signingWallet) throw new StoreError(StoreError.reasons.notInChannel);

  await Nonce.ensureLatest(constants.channelNonce, addresses, txOrKnex);

  const channel = Channel.fromJson(
    pick(
      {
        ...constants,
        assetHolderAddress: undefined,
        channelId: calculateChannelId(constants),
        fundingLedgerChannelId,
        fundingStrategy,
        signingAddress: signingWallet.address,
        vars: [],
      },
      ...CHANNEL_COLUMNS
    )
  );

  return await Channel.query(txOrKnex)
    .withGraphFetched('signingWallet')
    .insert(channel)
    .returning('*')
    .first();
}

function ensureSingleSignedState(
  states: SignedStateVarsWithHash[],
  mySigningAddress: string
): void {
  const multipleSignedByMe = _.chain(states)
    .filter(state => _.some(state.signatures, ['signer', mySigningAddress]))
    .groupBy('turnNum')
    .some(states => states.length > 1)
    .value();

  if (multipleSignedByMe) throw new StoreError(StoreError.reasons.multipleSignedStates);
}

function ensureReverseSortedOrderOfStates(states: SignedStateVarsWithHash[]): void {
  if (!isReverseSorted(_.map(states, 'turnNum')))
    throw new StoreError(StoreError.reasons.notSorted);
}

function ensureNoDuplicateTurnNums(states: SignedStateVarsWithHash[]): void {
  const turnNums = _.map(states, 'turnNum');
  const duplicateTurnNums = turnNums.some((t, i) => turnNums.indexOf(t) != i);
  if (duplicateTurnNums) {
    throw new StoreError(StoreError.reasons.duplicateTurnNums, {states});
  }
}

/**
 * There are currently two invariants being checked:
 *
 * 1. Only signed a single state for any given turn number.
 * 2. Storing states in reverse sorted order.
 */
function validateInvariants(states: SignedStateVarsWithHash[], mySigningAddress: string): void {
  ensureSingleSignedState(states, mySigningAddress);
  ensureNoDuplicateTurnNums(states);
  ensureReverseSortedOrderOfStates(states);
}
