import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  JoinChannelParams,
  CloseChannelParams,
  GetStateParams,
  Participant as APIParticipant,
  ChannelId,
  Message,
} from '@statechannels/client-api-schema';
import {
  deserializeAllocations,
  validatePayload,
  Outcome,
  convertToParticipant,
  makeAddress,
  Address as CoreAddress,
  PrivateKey,
  NULL_APP_DATA,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import Knex from 'knex';
import _ from 'lodash';
import {ethers, BigNumber, utils} from 'ethers';
import {Logger} from 'pino';
import {Payload as WirePayload} from '@statechannels/wire-format';
import {ValidationErrorItem} from 'joi';

import {Bytes32} from '../type-aliases';
import {createLogger} from '../logger';
import * as UpdateChannel from '../handlers/update-channel';
import * as JoinChannel from '../handlers/join-channel';
import {PushMessageError} from '../errors/engine-error';
import {timerFactory, recordFunctionMetrics, setupMetrics} from '../metrics';
import {
  EngineConfig,
  extractDBConfigFromEngineConfig,
  defaultConfig,
  IncomingEngineConfig,
  validateEngineConfig,
} from '../config';
import {ChainRequest} from '../chain-service';
import {WALLET_VERSION} from '../version';
import {ObjectiveManager} from '../objectives';
import {SingleAppUpdater} from '../handlers/single-app-updater';
import {LedgerManager} from '../protocols/ledger-manager';
import {WalletObjective, ObjectiveModel} from '../models/objective';
import {getMessages} from '../message-service/utils';

import {Store, AppHandler, MissingAppHandler} from './store';
import {
  SingleChannelOutput,
  MultipleChannelOutput,
  EngineInterface,
  hasNewObjective,
} from './types';
import {EngineResponse} from './engine-response';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results

export class ConfigValidationError extends Error {
  constructor(public errors: ValidationErrorItem[]) {
    super('Engine configuration validation failed');
  }
}

/**
 * A single-threaded Nitro engine
 */
export class SingleThreadedEngine implements EngineInterface {
  knex: Knex;
  store: Store;

  objectiveManager: ObjectiveManager;
  ledgerManager: LedgerManager;
  logger: Logger;

  readonly engineConfig: EngineConfig;

  public static async create(engineConfig: IncomingEngineConfig): Promise<SingleThreadedEngine> {
    return new SingleThreadedEngine(engineConfig);
  }

  /**
   * Protected method. Initialize engine via Engine.create(..)
   * @readonly
   */
  protected constructor(engineConfig: IncomingEngineConfig) {
    const populatedConfig = _.assign({}, defaultConfig, engineConfig);
    // Even though the config hasn't been validated we attempt to create a logger
    // This allows us to log out any config validation errors
    this.logger = createLogger(populatedConfig);

    this.logger.trace({engineConfig: populatedConfig}, 'Engine initializing');

    const {errors, valid} = validateEngineConfig(populatedConfig);

    if (!valid) {
      errors.forEach(error =>
        this.logger.error({error}, `Validation error occurred ${error.message}`)
      );
      throw new ConfigValidationError(errors);
    }
    this.engineConfig = populatedConfig;

    this.knex = Knex(extractDBConfigFromEngineConfig(this.engineConfig));

    this.store = new Store(
      this.knex,
      this.engineConfig.metricsConfiguration.timingMetrics,
      this.engineConfig.skipEvmValidation,
      utils.hexlify(this.engineConfig.networkConfiguration.chainNetworkID),
      this.logger
    );

    // set up timing metrics
    if (this.engineConfig.metricsConfiguration.timingMetrics) {
      // Validation ensures that the metricsOutputFile will be defined
      setupMetrics(this.engineConfig.metricsConfiguration.metricsOutputFile as string);
    }

    this.objectiveManager = ObjectiveManager.create({
      store: this.store,

      logger: this.logger,
      timingMetrics: this.engineConfig.metricsConfiguration.timingMetrics,
    });

    this.ledgerManager = LedgerManager.create({store: this.store});
  }

  /**
   * Adds an ethereum private key to the engine's database
   *
   * @remarks
   *
   * This key will be used to sign state channel upates.
   * If a key is not added, a random key will be generated the first time it is required.
   * If a private key already exists, calling this function wil be a no-op.
   *
   * @param  privateKey - An ethereum private key
   * @returns A promise that resolves when the key has been successfully added.
   */
  public async addSigningKey(privateKey: PrivateKey): Promise<void> {
    await this.store.addSigningKey(privateKey);
  }

  /**
   * Stores the supplied ForceMoveApp definition bytecode against the supplied blockchain address.
   *
   * @remarks
   * Storing the bytecode is necessary for the engine to verify ForceMoveApp transitions.
   *
   * @param  appDefinition - An ethereum address where ForceMoveApp rules are deployed.
   * @param  bytecode - The bytecode at that address.
   * @returns A promise that resolves when the bytecode has been successfully stored.
   */
  public async registerAppBytecode(appDefinition: string, bytecode: string): Promise<void> {
    return this.store.upsertBytecode(
      utils.hexlify(this.engineConfig.networkConfiguration.chainNetworkID),
      makeAddress(appDefinition),
      bytecode
    );
  }

  /**
   * Destroy this engine instance
   *
   * @remarks
   * Removes listeners from the chainService and destroys the engine's database connection.
   *
   * @returns A promise that resolves when the engine has been destroyed.
   */
  public async destroy(): Promise<void> {
    await this.knex.destroy();
  }

  /**
   * Trigger a response containing a message for counterparties, with all stored states for each a set of channels.
   *
   * @param channelIds - List of channel ids to be sync'ed
   * @returns A promise that resolves to an object containing the messages.
   */
  public async syncChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();

    await Promise.all(channelIds.map(channelId => this._syncChannel(channelId, response)));

    return response.multipleChannelOutput();
  }

  /**
   * Trigger a response containing a message for counterparties, with all objectives and channels for a set of objectives.
   * @param objectiveIds The ids of the objectives that should be sent to the counterparties
   * @returns A promise that resolves to an object containing the messages.
   */
  public async syncObjectives(objectiveIds: string[]): Promise<Message[]> {
    const response = EngineResponse.initialize();
    const objectives = await this.store.getObjectivesByIds(objectiveIds);

    const fetchedObjectiveIds = objectives.map(o => o.objectiveId);
    const missingObjectives = _.difference(objectiveIds, fetchedObjectiveIds);

    if (missingObjectives.length > 0) {
      this.logger.error(
        {objectiveIds: missingObjectives},
        'The following objectives cannot be found'
      );
      throw new Error('Could not find all objectives');
    }

    for (const o of objectives) {
      // NOTE: Currently we're fetching the channel twice
      // Once here and one in syncChannel
      // This could be refactored if performance is an issue
      const channel = await this.store.getChannelState(o.data.targetChannelId);
      // This will make sure any relevant channel information is synced
      await this._syncChannel(channel.channelId, response);

      const {participants} = channel;
      response.queueSendObjective(o, channel.myIndex, participants);
    }

    return response.allMessages;
  }

  /**
   * Trigger a response containing a message for all counterparties, with all stored states for a given channel.
   *
   * @param channelId - The channel id to be sync'ed
   * @returns A promise that resolves to an object containing the messages.
   */
  public async syncChannel({channelId}: SyncChannelParams): Promise<SingleChannelOutput> {
    const response = EngineResponse.initialize();
    await this._syncChannel(channelId, response);
    return response.singleChannelOutput();
  }

  private async _syncChannel(channelId: string, response: EngineResponse): Promise<void> {
    const {states, channelState} = await this.store.getStates(channelId);

    const {myIndex, participants} = channelState;

    states.forEach(s => response.queueState(s, myIndex, channelId));
    response.queueChannelRequest(channelId, myIndex, participants);
    response.queueChannelState(channelState);
  }

  /**
   * Trigger an on-chain challenge.
   *
   * @param challengeState - The state to raise the challenge with.
   * @returns A promise that resolves to a channel output.
   */
  public async challenge(channelId: string): Promise<SingleChannelOutput> {
    const response = EngineResponse.initialize();

    await this.knex.transaction(async tx => {
      const channel = await this.store.getChannel(channelId, tx);
      if (!channel) {
        throw new Error(`No channel found for channel id ${channelId}`);
      }
      // START CHALLENGING_V0
      if (!channel.isLedger) {
        throw new Error('Only ledger channels support challenging');
      }
      // END CHALLENGING_V0

      const objective = await ObjectiveModel.insert(
        {
          type: 'SubmitChallenge',
          participants: [],
          data: {targetChannelId: channelId},
        },

        tx,
        'approved'
      );
      response.queueCreatedObjective(objective, channel.myIndex, channel.participants);

      response.queueChannel(channel);
    });

    await this.takeActions([channelId], response);
    // TODO: In v0 of challenging the challengeStatus on the channel will not be updated
    // We return a single channel result anwyays in case there are messages in the outbox
    return response.singleChannelOutput();
  }

  /**
   * Get the signing address for this engine, or create it if it does not exist.
   *
   * @returns A promise that resolves to the address.
   */
  public async getSigningAddress(): Promise<CoreAddress> {
    return await this.store.getOrCreateSigningAddress();
  }

  /**
   * Creates a ledger channel.
   *
   * @remarks
   * The channel will have a null app definition and null app data.
   * This method is otherwise identical to {@link SingleThreadedEngine.createChannel}.
   *
   * @returns A promise that resolves to the channel output.
   */
  async createLedgerChannel(
    args: Pick<CreateChannelParams, 'participants' | 'allocations' | 'challengeDuration'>,
    fundingStrategy: 'Direct' | 'Fake' = 'Direct'
  ): Promise<SingleChannelOutput> {
    const response = EngineResponse.initialize();

    await this._createChannel(
      response,
      {
        ...args,
        appDefinition: ethers.constants.AddressZero,
        appData: NULL_APP_DATA,
        fundingStrategy,
      },
      'ledger'
    );

    // NB: We intentionally do not call this.takeActions, because there are no actions to take when creating a channel.

    return response.singleChannelOutput();
  }
  /**
   * Creates a channel.
   *
   * @remarks
   * The channel's nonce will be automatically chosen.
   * The channel will be registered with the engine's chain service.
   * The 0th state will be created and signed.
   * An OpenChannel objective will be created and approved.
   *
   * @param args - Parameters to create the channel with.
   * @returns A promise that resolves to the channel output.
   */
  async createChannel(
    args: CreateChannelParams
  ): Promise<SingleChannelOutput & {newObjective: WalletObjective}> {
    const response = EngineResponse.initialize();

    await this._createChannel(response, args, 'app');

    // NB: We intentionally do not call this.takeActions, because there are no actions to take when creating a channel.

    const result = response.singleChannelOutput();
    if (!hasNewObjective(result)) {
      throw new Error('No new objective created for create channel');
    } else {
      return result;
    }
  }
  /**
   * Creates multiple channels with the same parameters. See {@link SingleThreadedEngine.createChannel}.
   *
   * @param args - Parameters to create the channels with.
   * @param numberOfChannels - The number of desired channels.
   * @returns A promise that resolves to the channel output.
   */
  async createChannels(
    args: CreateChannelParams,
    numberOfChannels: number
  ): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();

    for (const _i of _.range(numberOfChannels)) {
      await this._createChannel(response, args, 'app');
    }

    // NB: We intentionally do not call this.takeActions, because there are no actions to take when creating a channel.

    return response.multipleChannelOutput();
  }

  private async _createChannel(
    response: EngineResponse,
    args: CreateChannelParams,
    role: 'app' | 'ledger' = 'app'
  ): Promise<string> {
    const {
      participants: serializedParticipants,
      appDefinition,
      appData,
      allocations,
      fundingStrategy,
      fundingLedgerChannelId,
      challengeDuration,
    } = args;

    const participants = serializedParticipants.map(convertToParticipant);
    const outcome: Outcome = deserializeAllocations(allocations);

    const channelNonce = await this.store.nextNonce(participants.map(p => p.signingAddress));

    const constants = {
      appDefinition: makeAddress(appDefinition),
      chainId: BigNumber.from(this.engineConfig.networkConfiguration.chainNetworkID).toHexString(),
      challengeDuration,
      channelNonce,
      participants,
    };

    const {channel, firstSignedState: signedState, objective} = await this.store.createChannel(
      constants,
      appData,
      outcome,
      fundingStrategy,
      role,
      fundingLedgerChannelId
    );

    response.queueState(signedState, channel.myIndex, channel.channelId);
    response.queueCreatedObjective(objective, channel.myIndex, channel.participants);
    response.queueChannelState(channel);

    return channel.channelId;
  }

  /**
   * Joins a list of channels.
   *
   * @remarks
   * Approves an OpenChannel objective for each channel, if it exists, and cranks it.
   * Registers each channel with the engine's chain service.
   *
   * @param channelIds - The list of ids of the channels to join.
   * @returns A promise that resolves to the channel output.
   */
  async joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();
    const objectives = await this.store.getObjectives(channelIds);

    await Promise.all(
      objectives
        .filter(o => o.type === 'OpenChannel')
        .map(async ({objectiveId}) => await this.store.approveObjective(objectiveId))
    );

    await this.takeActions(channelIds, response);

    return response.multipleChannelOutput();
  }

  private async approveObjective(
    objectiveId: string,
    targetChannelId: string
  ): Promise<WalletObjective> {
    return this.store.transaction(async tx => {
      await this.store.getAndLockChannel(targetChannelId, tx);

      const objective = await this.store.getObjective(objectiveId, tx);

      if (objective.status === 'pending') {
        const approved = await this.store.approveObjective(objectiveId, tx);

        return approved;
      } else {
        return objective;
      }
    });
  }

  async approveObjectives(
    objectiveIds: string[]
  ): Promise<{objectives: WalletObjective[]; messages: Message[]; chainRequests: ChainRequest[]}> {
    const channelIds: string[] = [];
    const response = EngineResponse.initialize();
    let objectives = await this.store.getObjectivesByIds(objectiveIds);
    for (const objective of objectives) {
      const {objectiveId, data} = objective;
      await this.approveObjective(objectiveId, data.targetChannelId);
      channelIds.push(data.targetChannelId);
    }

    await this.takeActions(channelIds, response);

    // Some objectives may now be completed so we want to refetch them
    // This could be handled by pulling objectives off the response
    // But this is more straightforward for now
    objectives = await this.store.getObjectivesByIds(objectiveIds);

    return {
      objectives,
      messages: getMessages(response.multipleChannelOutput()),
      chainRequests: response.chainRequests,
    };
  }

  /**
   * Joins a channel.
   *
   * @remarks
   * Approves an OpenChannel objective for this channel, if it exists, and cranks it.
   * Registers the channel with the engine's chain service.
   * Throws an error if the channel is not known to this engine.
   * Throws an error if no objectives are known that have this channel in scope.
   *
   * @param channelId - The id of the channel to join.
   * @returns A promise that resolves to the channel output.
   */
  async joinChannel({channelId}: JoinChannelParams): Promise<SingleChannelOutput> {
    const response = EngineResponse.initialize();
    const channel = await this.store.getChannelState(channelId);

    if (!channel)
      throw new JoinChannel.JoinChannelError(
        JoinChannel.JoinChannelError.reasons.channelNotFound,
        channelId
      );

    const objectives = await this.store.getObjectives([channelId]);

    if (objectives.length !== 1) {
      const msg = 'Expecting exactly one objective';
      this.logger.error({channelId, objectives}, msg);
      throw new Error(msg);
    }

    const objective = objectives[0];

    if (objective.type === 'OpenChannel') {
      await this.store.approveObjective(objective.objectiveId);
    } else {
      // TODO: Shouldn't we do something about this??
    }

    await this.takeActions([channelId], response);

    // set strict=false to silently drop any ledger channel updates from channelResults
    // TODO: change api so that joinChannel returns a MultipleChannelOutput
    return response.singleChannelOutput(false);
  }

  /**
   * Attempts to make progress on any open objectives for the specified channels.
   * This is used to make progress on objectives after something has changed in the store.
   * @param channelIds The channels that progress should be made on.
   * @returns The channel output which contains any new messages, chain requests, or objective events.
   */
  public async crank(channelIds: string[]): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();

    await this.takeActions(channelIds, response);

    return response.multipleChannelOutput();
  }

  /**
   * Updates a channel with a new state.
   *
   * @remarks
   * Signs and stores the new state, returns the result in a message for counterparties.
   * Throws an error if the channel is not known to this engine.
   * Throws an error if no objectives are known that have this channel in scope.
   *
   * @param channelId - The id of the channel to update.
   * @param allocations - New allocations describing a new outcome (distribution of assets) for the channel.
   * @param appData - New application-specific data.
   * @returns A promise that resolves to the channel output.
   */
  async updateChannel({
    channelId,
    allocations,
    appData,
  }: UpdateChannelParams): Promise<SingleChannelOutput> {
    const timer = timerFactory(
      this.engineConfig.metricsConfiguration.timingMetrics,
      `updateChannel ${channelId}`
    );
    const handleMissingChannel: MissingAppHandler<Promise<SingleChannelOutput>> = () => {
      throw new UpdateChannel.UpdateChannelError(
        UpdateChannel.UpdateChannelError.reasons.channelNotFound,
        {channelId}
      );
    };
    const criticalCode: AppHandler<Promise<SingleChannelOutput>> = async (tx, channel) => {
      const response = EngineResponse.initialize();
      const {myIndex} = channel;

      const outcome = recordFunctionMetrics(
        deserializeAllocations(allocations),
        this.engineConfig.metricsConfiguration.timingMetrics
      );

      const nextState = getOrThrow(
        recordFunctionMetrics(
          UpdateChannel.updateChannel({channelId, appData, outcome}, channel.protocolState),
          this.engineConfig.metricsConfiguration.timingMetrics
        )
      );
      const signedState = await timer('signing state', async () => {
        try {
          return this.store.signState(channel, nextState, tx);
        } catch (err) {
          this.logger.error({err, nextState}, 'Unable to update channel');
          throw err;
        }
      });
      response.queueState(signedState, myIndex, channelId);

      const channelState = await this.store.getChannelState(channelId, tx);
      response.queueChannelState(channelState);

      return response.singleChannelOutput();
    };

    return this.store.lockApp(channelId, criticalCode, handleMissingChannel, true);
  }

  /**
   * Attempts to collaboratively close a list of channels.
   *
   * @remarks
   * Signs, stores, and sends an isFinal=true state for each channel in the list.
   * Creates, approves and cranks a CloseChannel objective for each channel in the list. See {@link SingleThreadedEngine.closeChannel}.
   *
   * @param channelId - The id of the channel to try and close.
   * @returns A promise that resolves to the channel output.
   */
  async closeChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();

    for (const channelId of channelIds) await this._closeChannel(channelId, response);

    await this.takeActions(channelIds, response);

    return response.multipleChannelOutput();
  }

  /**
   * Attempts to collaboratively close a channel.
   *
   * @remarks
   * Signs, stores, and sends an isFinal=true state.
   * Creates, approves and cranks a CloseChannel objective for the supplied channel.
   * This objective continues working after this call resolves, and will attempt to defund the channel.
   *
   * @param channelId - The id of the channel to try and close.
   * @returns A promise that resolves to the channel output. Will always return a new objective.
   */
  async closeChannel({
    channelId,
  }: CloseChannelParams): Promise<SingleChannelOutput & {newObjective: WalletObjective}> {
    const response = EngineResponse.initialize();

    await this._closeChannel(channelId, response);
    await this.takeActions([channelId], response);

    const result = response.singleChannelOutput();
    if (!hasNewObjective(result)) {
      throw new Error('No new objective created for closeChannel');
    } else {
      return result;
    }
  }

  private async _closeChannel(channelId: Bytes32, response: EngineResponse): Promise<void> {
    await this.objectiveManager.commenceCloseChannel(channelId, response);
  }

  /**
   * Gets the latest state for each ledger channel in the engine's store.
   *
   * @param assetHolderAddress - The on chain address of an asset holder contract funding the ledger channels (filters the query).
   * @param participants - The list of participants in the ledger channel (filters the query).
   * @returns A promise that resolves to the channel output.
   */
  async getLedgerChannels(
    assetHolderAddress: string,
    participants: APIParticipant[]
  ): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();

    const channelStates = await this.store.getLedgerChannels(
      assetHolderAddress,
      participants.map(convertToParticipant)
    );

    channelStates.forEach(cs => response.queueChannelState(cs));

    return response.multipleChannelOutput();
  }

  /**
   * Gets the latest state for each channel in the engine's store.
   *
   * @returns A promise that resolves to the channel output.
   */
  async getChannels(): Promise<MultipleChannelOutput> {
    const response = EngineResponse.initialize();

    const channelStates = await this.store.getChannels();
    channelStates.forEach(cs => response.queueChannelState(cs));

    return response.multipleChannelOutput();
  }

  /**
   * Gets the objective for a given id.
   *
   * @returns A promise that resolves to a WalletObjective, with a progressLastMadeAt timestamp
   */
  async getObjective(objectiveId: string): Promise<WalletObjective> {
    return this.store.getObjective(objectiveId);
  }

  /**
   * Gets any objectives with an approved status
   * @returns A promise that resolves to a collection of WalletObjectives
   */
  async getApprovedObjectives(): Promise<WalletObjective[]> {
    return this.store.getApprovedObjectives();
  }

  /**
   * Gets the latest state for a channel.
   *
   * @privateRemarks TODO: Consider renaming this to getChannel() to match getChannels()
   * @returns A promise that resolves to the channel output.
   */
  async getState({channelId}: GetStateParams): Promise<SingleChannelOutput> {
    const response = EngineResponse.initialize();

    try {
      const channel = await this.store.getChannelState(channelId);

      response.queueChannelState(channel);

      return response.singleChannelOutput();
    } catch (err) {
      this.logger.error({err}, 'Could not get channel');
      throw err;
    }
  }

  /**
   * Push a message from a counterparty into the engine.
   *
   * @remarks
   * Fresh states will be stored.
   * Requests will be handled.
   * Objectives with updated channels in scope will be cranked.
   *
   * @param rawPayload - The message to be pushed. Will be validated against a schema.
   * @returns A promise that resolves to the channel output.
   */
  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    const wirePayload = validatePayload(rawPayload);

    const response = EngineResponse.initialize();

    try {
      await this._pushMessage(wirePayload, response);

      return response.multipleChannelOutput();
    } catch (err) {
      this.logger.error({err}, 'Error during pushMessage');
      throw new PushMessageError('Error during pushMessage', {
        thisWalletVersion: WALLET_VERSION,
        payloadWalletVersion: wirePayload.walletVersion,
        cause: err,
      });
    }
  }

  /**
   * Push a message containing a single update to a running application channel.
   *
   * @remarks
   * A single fresh state will be stored.
   * No fresh requests or objectives will stored.
   * No objectives will be cranked.
   *
   * @param rawPayload - The message to be pushed. Will be validated against a schema.
   * @returns A promise that resolves to the channel output.
   */
  async pushUpdate(rawPayload: unknown): Promise<SingleChannelOutput> {
    const wirePayload = validatePayload(rawPayload);

    const response = EngineResponse.initialize();

    await SingleAppUpdater.create(this.store).update(wirePayload, response);

    return response.singleChannelOutput();
  }

  private async _pushMessage(wirePayload: WirePayload, response: EngineResponse): Promise<void> {
    const store = this.store;

    const {
      channelIds: channelIdsFromStates,
      channelResults: fromStoring,
      storedObjectives,
    } = await this.store.pushMessage(wirePayload);

    // HACK (1): This may cause the engine to re-emit `'objectiveStarted'` multiple times
    // For instance, a peer who sends me an objective `o`, and then triggers `syncObjectives`
    // including `o`, will cause my engine to emit `'objectiveStarted'` for `o` twice.
    response.createdObjectives = storedObjectives;

    const channelIdsFromRequests: Bytes32[] = [];
    const requests = wirePayload.requests || [];

    for (const request of requests) {
      const {channelId} = request;

      channelIdsFromRequests.push(channelId);

      switch (request.type) {
        case 'GetChannel': {
          const {states: signedStates, channelState} = await store.getStates(channelId);

          // add signed states to response
          signedStates.forEach(s => response.queueState(s, channelState.myIndex, channelId));
          continue;
        }
        default:
          continue;
      }
    }

    // add channelResults to response
    fromStoring.forEach(cr => response.queueChannelResult(cr));

    const channelIds = _.uniq(channelIdsFromStates.concat(channelIdsFromRequests));

    await this.takeActions(channelIds, response);
  }

  /**
   * Active objectives for the "touched" channels are cranked. Theoretically, this may touch other
   * channels, resulting in a cascade of cranked objectives.
   *
   * @remarks
   * Emits an 'objectiveSucceded' event for objectives that succeed.
   *
   * @param channels channels touched by the caller
   * @param response EngineResponse that is modified in place while cranking objectives
   */
  private async takeActions(channelIds: Bytes32[], response: EngineResponse): Promise<void> {
    // 1. we're passed a set of channelIds that have changed
    // 2. we crank any objectives that involve changed channels, which could create new ledger requests
    // 3. we crank any ledgers with new requests, which could update those requests
    // 4. if any requests changed, we treat the corresponding channels as changed and go to step 2

    while (channelIds.length > 0) {
      const objectiveIds = await this.store.getApprovedObjectiveIds(channelIds);
      for (const objectiveId of objectiveIds) {
        await this.objectiveManager.crank(objectiveId, response);
      }

      const ledgersFromRequests = await this.store.getLedgersWithNewRequestsIds();
      const ledgersFromChannels = await this.store.filterChannelIdsByIsLedger(channelIds);
      const ledgersToProcess = _.uniq(ledgersFromChannels.concat(ledgersFromRequests));

      channelIds = [];
      for (const ledgerChannelId of ledgersToProcess) {
        //todo: how to handle errors
        const touchedChannels = await this.ledgerManager.crank(ledgerChannelId, response);
        channelIds = [...channelIds, ...touchedChannels];
      }
    }
  }
}

// TODO: This should be removed, and not used externally.
// It is a fill-in until the engine API is specced out.
export function getOrThrow<E, T>(result: Either.Either<E, T>): T {
  return Either.getOrElseW<E, T>(
    (err: E): T => {
      throw err;
    }
  )(result);
}
