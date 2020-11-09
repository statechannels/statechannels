import {Transaction, TransactionOrKnex} from 'objection';
import {
  Objective,
  Outcome,
  SignedStateWithHash,
  SignedStateVarsWithHash,
  calculateChannelId,
  StateVariables,
  ChannelConstants,
  Participant,
  makeDestination,
  deserializeObjective,
  isOpenChannel,
  isCloseChannel,
  SignedState,
  objectiveId,
  isSimpleAllocation,
  checkThat,
  CloseChannel,
  OpenChannel,
} from '@statechannels/wallet-core';
import {Payload as WirePayload, SignedState as WireSignedState} from '@statechannels/wire-format';
import _ from 'lodash';
import {ChannelResult, FundingStrategy} from '@statechannels/client-api-schema';
import {ethers} from 'ethers';
import Knex from 'knex';
import {Logger} from 'pino';

import {Channel, ChannelError, CHANNEL_COLUMNS} from '../models/channel';
import {SigningWallet} from '../models/signing-wallet';
import {addHash, addState, clearOldStates, fastDeserializeState} from '../state-utils';
import {ChannelState, ChainServiceApi} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';
import {Bytes32, Address, Uint256, Bytes} from '../type-aliases';
import {timerFactory, recordFunctionMetrics, setupDBMetrics} from '../metrics';
import {isReverseSorted, pick} from '../utilities/helpers';
import {Funding} from '../models/funding';
import {Nonce} from '../models/nonce';
import {ObjectiveModel, DBObjective} from '../models/objective';
import {AppBytecode} from '../models/app-bytecode';
import {LedgerRequest, LedgerRequestType} from '../models/ledger-request';
import {shouldValidateTransition, validateTransition} from '../utilities/validate-transition';
import {logger as defaultLogger} from '../logger';

export type AppHandler<T> = (tx: Transaction, channel: ChannelState) => T;
export type MissingAppHandler<T> = (channelId: string) => T;

class UniqueViolationError extends Error {
  columns: string[] = [];
}

function isUniqueViolationError(error: any): error is UniqueViolationError {
  return error?.name === 'UniqueViolationError' && error?.columns[0] === 'enforce_one_row';
}

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
      this.getFirstParticipant = recordFunctionMetrics(this.getFirstParticipant);
      this.getOrCreateSigningAddress = recordFunctionMetrics(this.getOrCreateSigningAddress);
      this.lockApp = recordFunctionMetrics(this.lockApp);
      this.signState = recordFunctionMetrics(this.signState);
      this.getChannel = recordFunctionMetrics(this.getChannel);
      this.getStates = recordFunctionMetrics(this.getStates);
      this.getChannels = recordFunctionMetrics(this.getChannels);
      this.addObjective = recordFunctionMetrics(this.addObjective);
      this.pushMessage = recordFunctionMetrics(this.pushMessage);
      this.addSignedState = recordFunctionMetrics(this.addSignedState);

      setupDBMetrics(this.knex);
      if (logger) this.logger = logger;
    }
  }

  async destroy(): Promise<void> {
    await this.knex.destroy();
  }

  async getFirstParticipant(): Promise<Participant> {
    const signingAddress = await this.getOrCreateSigningAddress();
    return {
      participantId: signingAddress,
      signingAddress,
      destination: makeDestination(signingAddress),
    };
  }

  async getOrCreateSigningAddress(): Promise<string> {
    const randomWallet = ethers.Wallet.createRandom();
    // signing_wallets table allows for only one row via database constraints
    try {
      // returning('*') only works with Postgres
      // https://vincit.github.io/objection.js/recipes/returning-tricks.html
      const signingWallet = await SigningWallet.query(this.knex)
        .insert({
          privateKey: randomWallet.privateKey,
          address: randomWallet.address,
        })
        .returning('*');
      return signingWallet.address;
    } catch (error) {
      if (isUniqueViolationError(error)) {
        return (await SigningWallet.query(this.knex).first()).address;
      }
      throw error;
    }
  }

  /**
   * Ensure a channel is only update-able by some criticable code within a transaction.
   *
   * @param channelId application channel Id
   * @param cb critical code to be executed while holding a lock on channelId
   *
   * This excutes `cb` within the context of a SQL transaction, after first acquiring a row-level
   * lock on a single row in the Channels table. This guarantees that at most one `cb` can be
   * executing concurrently across all wallets.
   */
  async lockApp<T>(
    channelId: Bytes32,
    criticalCode: AppHandler<T>,
    onChannelMissing: MissingAppHandler<T> = throwMissingChannel
  ): Promise<T> {
    return this.knex.transaction(async tx => {
      const timer = timerFactory(this.timingMetrics, `lock app ${channelId}`);
      const channel = await timer('getting channel', () =>
        Channel.query(tx)
          .where({channelId})
          .forUpdate()
          .first()
      );

      if (!channel) return onChannelMissing(channelId);
      return timer('critical code', async () => criticalCode(tx, channel.protocolState));
    });
  }

  async signState(
    channelId: Bytes32,
    vars: StateVariables,
    tx: Transaction // Insist on a transaction since addSignedState requires it
  ): Promise<SignedState> {
    const timer = timerFactory(this.timingMetrics, `signState ${channelId}`);

    const channel = await timer('getting channel', async () => Channel.forId(channelId, tx));

    const state = addHash({...channel.channelConstants, ...vars});

    const {supported, latestSignedByMe} = channel;

    if (latestSignedByMe && latestSignedByMe.turnNum >= state.turnNum)
      // Don't sign a new state with lower turnNum than already signed by you
      throw new StoreError(StoreError.reasons.staleState);

    const signatureEntry = await timer('signing', async () =>
      channel.signingWallet.signState(state)
    );
    const signedState = {...state, signatures: [signatureEntry]};

    if (supported && shouldValidateTransition(state, channel)) {
      const bytecode = await this.getBytecode(supported.appDefinition, tx);

      if (!this.skipEvmValidation && !bytecode)
        this.logger.error('Missing bytecode', {
          error: new Error(`No byte code for ${supported.appDefinition}`),
        });

      if (
        !(await timer('validating transition', async () =>
          validateTransition(supported, signedState, bytecode, this.skipEvmValidation)
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

  async addChainServiceRequest(
    channelId: Bytes32,
    type: ChainServiceApi,
    tx: Transaction
  ): Promise<void> {
    const channel = await Channel.forId(channelId, tx);

    await Channel.query(tx)
      .where({channelId: channel.channelId})
      .patch({chainServiceRequests: [...channel.chainServiceRequests, type]});
  }

  async getChannel(channelId: Bytes32, tx?: Transaction): Promise<ChannelState> {
    // This is somewhat faster than Channel.forId for simply fetching a channel:
    // - the signingWallet isn't needed to construct the protocol state
    // - withGraphJoined is slightly faster in this case
    return (
      await Channel.query(tx ?? this.knex)
        .where({'channels.channel_id': channelId})
        .withGraphJoined('funding')
        .first()
    )?.protocolState;
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
    objectives: DBObjective[];
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
        storedObjectives.push(await this.addObjective(o, tx));
      }

      const objectiveChannelIds = storedObjectives
        .filter(objective => isOpenChannel(objective) || isCloseChannel(objective))
        .map(objective => objective.data.targetChannelId);

      return {
        channelIds: stateChannelIds.concat(objectiveChannelIds),
        objectives: storedObjectives.filter(o => o.status === 'pending'),
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

  async markObjectiveAsSucceeded(objective: DBObjective, tx?: Transaction): Promise<void> {
    await ObjectiveModel.succeed(objective.objectiveId, tx || this.knex);
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
    tx = tx || this.knex; // todo: make tx required
    return await ObjectiveModel.forId(objectiveId, tx);
  }

  async addObjective(objective: Objective, tx: Transaction): Promise<DBObjective> {
    switch (objective.type) {
      case 'OpenChannel':
        return this.addOpenChannelObjective(objective, tx);
      case 'CloseChannel':
        return this.addCloseChannelObjective(objective, tx);
      default:
        throw new StoreError(StoreError.reasons.unimplementedObjective);
    }
  }

  private async addOpenChannelObjective(
    objective: OpenChannel,
    tx: Transaction
  ): Promise<DBObjective> {
    const {
      data: {targetChannelId: channelId, fundingStrategy, fundingLedgerChannelId, role},
    } = objective;

    // fetch the channel to make sure the channel exists
    const channel = await this.getChannel(channelId, tx);
    if (!channel) {
      throw new StoreError(StoreError.reasons.channelMissing, {channelId});
    }

    if (!_.includes(['Ledger', 'Direct', 'Fake'], objective.data.fundingStrategy))
      throw new StoreError(StoreError.reasons.unimplementedFundingStrategy, {fundingStrategy});

    const objectiveToBeStored: DBObjective = {
      objectiveId: objectiveId(objective),
      participants: [],
      status: 'pending',
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

    await ObjectiveModel.insert(objectiveToBeStored, tx);

    await Channel.query(tx)
      .where({channelId: channel.channelId})
      .patch({fundingStrategy, fundingLedgerChannelId})
      .returning('*')
      .first();

    return objectiveToBeStored;
  }

  private async addCloseChannelObjective(
    objective: CloseChannel,
    tx: Transaction
  ): Promise<DBObjective> {
    const {
      data: {targetChannelId, fundingStrategy},
    } = objective;

    // fetch the channel to make sure the channel exists
    const channel = await this.getChannel(targetChannelId, tx);
    if (!channel)
      throw new StoreError(StoreError.reasons.channelMissing, {
        channelId: targetChannelId,
      });

    const objectiveToBeStored: DBObjective = {
      objectiveId: objectiveId(objective),
      status: 'approved',
      type: objective.type,
      participants: [],
      data: {
        targetChannelId,
        fundingStrategy,
      },
    };

    await ObjectiveModel.insert(objectiveToBeStored, tx);

    return objectiveToBeStored;
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

  async getAllPendingLedgerRequests(tx?: Transaction): Promise<LedgerRequestType[] | undefined> {
    return LedgerRequest.getAllPendingRequests(tx || this.knex);
  }

  async getPendingLedgerRequests(
    ledgerChannelId: Bytes32,
    tx?: Transaction
  ): Promise<LedgerRequestType[] | undefined> {
    return LedgerRequest.getPendingRequests(ledgerChannelId, tx || this.knex);
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
    const timer = timerFactory(this.timingMetrics, `add signed state ${channelId}`);

    // Deserialize (and validate signatures in the process)
    const deserializedState = await timer('validating signatures', async () =>
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

      if (!this.skipEvmValidation && !bytecode)
        this.logger.error('Missing bytecode', {
          error: new Error(`No byte code for ${supported.appDefinition}`),
        });

      const isValidTransition = await timer('validating transition', async () =>
        validateTransition(supported, state, bytecode, this.skipEvmValidation)
      );

      if (!isValidTransition) {
        throw new StoreError('Invalid state transition', {
          from: supported,
          to: state,
        });
      }
    }

    // Create the new Channel object by adding the new state
    channel.vars = await timer('adding state', async () => addState(channel.vars, state));

    // Do 'garbage collection' by removing unnecessary / stale states
    channel.vars = clearOldStates(channel.vars, channel.isSupported ? channel.support : undefined);

    // Do checks on the Channel object before inserting into the database
    await timer('validating invariants', async () =>
      validateInvariants(channel.vars, channel.myAddress)
    );

    // Insert into the DB
    return await timer('updating', () =>
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
    fundingLedgerChannelId?: Address
  ): Promise<{channel: ChannelState; firstSignedState: SignedState; objective: Objective}> {
    return await this.knex.transaction(async tx => {
      const {channelId, participants} = await createChannel(
        constants,
        fundingStrategy,
        fundingLedgerChannelId,
        tx
      );

      const firstSignedState = await this.signState(
        channelId,
        {
          ...constants,
          turnNum: 0,
          isFinal: false,
          appData,
          outcome,
        },
        tx
      );

      const objective = {
        type: 'OpenChannel' as const,
        participants,
        data: {
          targetChannelId: channelId,
          fundingStrategy,
          fundingLedgerChannelId,
          role,
        },
      };

      const {objectiveId} = await this.addObjective(objective, tx);
      await this.approveObjective(objectiveId, tx);

      return {channel: await this.getChannel(channelId, tx), firstSignedState, objective};
    });
  }

  async updateFunding(
    channelId: string,
    fromAmount: Uint256,
    assetHolderAddress: Address
  ): Promise<void> {
    await Funding.updateFunding(this.knex, channelId, fromAmount, assetHolderAddress);
  }

  async updateTransferredOut(
    channelId: string,
    assetHolder: Address,
    toAddress: Address,
    amount: Uint256
  ): Promise<void> {
    await Funding.updateTransferredOut(this.knex, channelId, assetHolder, toAddress, amount);
  }

  async nextNonce(signingAddresses: Address[]): Promise<number> {
    return await Nonce.next(this.knex, signingAddresses);
  }
}

class StoreError extends WalletError {
  readonly type = WalletError.errors.StoreError;

  static readonly reasons = {
    duplicateChannel: 'Expected the channel to NOT exist in the database',
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
  fundingLedgerChannelId: Address | undefined,
  txOrKnex: TransactionOrKnex
): Promise<Channel> {
  const addresses = constants.participants.map(p => p.signingAddress);

  const signingWallet = await SigningWallet.query(txOrKnex)
    .whereIn('address', addresses)
    .first();

  if (!signingWallet) throw new StoreError(StoreError.reasons.notInChannel);

  await Nonce.ensureLatest(constants.channelNonce, addresses, txOrKnex);

  const channel = Channel.fromJson(
    pick(
      {
        ...constants,
        assetHolderAddress: undefined,
        chainServiceRequests: [],
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

/**
 * There are currently two invariants being checked:
 *
 * 1. Only signed a single state for any given turn number.
 * 2. Storing states in reverse sorted order.
 */
function validateInvariants(states: SignedStateVarsWithHash[], mySigningAddress: string): void {
  ensureSingleSignedState(states, mySigningAddress);
  ensureReverseSortedOrderOfStates(states);
}
