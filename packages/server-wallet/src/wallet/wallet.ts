import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  JoinChannelParams,
  CloseChannelParams,
  GetStateParams,
  Participant as APIParticipant,
  ChannelId,
} from '@statechannels/client-api-schema';
import {
  deserializeAllocations,
  validatePayload,
  Outcome,
  convertToParticipant,
  BN,
  makeAddress,
  Address as CoreAddress,
  PrivateKey,
  makeDestination,
  deserializeRequest,
  NULL_APP_DATA,
} from '@statechannels/wallet-core';
import * as Either from 'fp-ts/lib/Either';
import Knex from 'knex';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import {ethers, constants, BigNumber, utils} from 'ethers';
import {Logger} from 'pino';
import {Payload as WirePayload} from '@statechannels/wire-format';
import {ValidationErrorItem} from 'joi';

import {Bytes32} from '../type-aliases';
import {createLogger} from '../logger';
import * as UpdateChannel from '../handlers/update-channel';
import * as JoinChannel from '../handlers/join-channel';
import * as ChannelState from '../protocols/state';
import {PushMessageError} from '../errors/wallet-error';
import {timerFactory, recordFunctionMetrics, setupMetrics} from '../metrics';
import {
  ServerWalletConfig,
  extractDBConfigFromServerWalletConfig,
  defaultConfig,
  IncomingServerWalletConfig,
  validateServerWalletConfig,
} from '../config';
import {
  ChainServiceInterface,
  ChainEventSubscriberInterface,
  HoldingUpdatedArg,
  ChainService,
  MockChainService,
  ChannelFinalizedArg,
  AssetOutcomeUpdatedArg,
  ChallengeRegisteredArg,
} from '../chain-service';
import {WALLET_VERSION} from '../version';
import {ObjectiveManager} from '../objectives';
import {SingleAppUpdater} from '../handlers/single-app-updater';
import {LedgerManager} from '../protocols/ledger-manager';
import {DBObjective} from '../models/objective';

import {Store, AppHandler, MissingAppHandler} from './store';
import {
  SingleChannelOutput,
  MultipleChannelOutput,
  Output,
  WalletInterface,
  UpdateChannelFundingParams,
  WalletEvent,
} from './types';
import {WalletResponse} from './wallet-response';

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// Nor does it allow for multiple channel results

type EventEmitterType = {
  [key in WalletEvent['type']]: WalletEvent['value'];
};

export class ConfigValidationError extends Error {
  constructor(public errors: ValidationErrorItem[]) {
    super('Server wallet configuration validation failed');
  }
}

/**
 * A single-threaded Nitro wallet
 */
export class SingleThreadedWallet
  extends EventEmitter<EventEmitterType>
  implements WalletInterface, ChainEventSubscriberInterface {
  knex: Knex;
  store: Store;
  chainService: ChainServiceInterface;
  objectiveManager: ObjectiveManager;
  ledgerManager: LedgerManager;
  logger: Logger;

  readonly walletConfig: ServerWalletConfig;

  public static async create(
    walletConfig: IncomingServerWalletConfig
  ): Promise<SingleThreadedWallet> {
    const wallet = new SingleThreadedWallet(walletConfig);

    await wallet.registerExistingChannelsWithChainService();
    return wallet;
  }

  /**
   * Protected method. Initialize wallet via Wallet.create(..)
   * @readonly
   */
  protected constructor(walletConfig: IncomingServerWalletConfig) {
    super();

    const populatedConfig = _.assign({}, defaultConfig, walletConfig);
    // Even though the config hasn't been validated we attempt to create a logger
    // This allows us to log out any config validation errors
    this.logger = createLogger(populatedConfig);

    this.logger.trace({walletConfig: populatedConfig}, 'Wallet initializing');

    const {errors, valid} = validateServerWalletConfig(populatedConfig);

    if (!valid) {
      errors.forEach(error =>
        this.logger.error({error}, `Validation error occurred ${error.message}`)
      );
      throw new ConfigValidationError(errors);
    }
    this.walletConfig = populatedConfig;

    this.knex = Knex(extractDBConfigFromServerWalletConfig(this.walletConfig));

    this.store = new Store(
      this.knex,
      this.walletConfig.metricsConfiguration.timingMetrics,
      this.walletConfig.skipEvmValidation,
      utils.hexlify(this.walletConfig.networkConfiguration.chainNetworkID),
      this.logger
    );

    // set up timing metrics
    if (this.walletConfig.metricsConfiguration.timingMetrics) {
      // Validation ensures that the metricsOutputFile will be defined
      setupMetrics(this.walletConfig.metricsConfiguration.metricsOutputFile as string);
    }

    if (this.walletConfig.chainServiceConfiguration.attachChainService) {
      this.chainService = new ChainService({
        ...this.walletConfig.chainServiceConfiguration,
        logger: this.logger,
      });
    } else {
      this.chainService = new MockChainService();
    }

    this.objectiveManager = ObjectiveManager.create({
      store: this.store,
      chainService: this.chainService,
      logger: this.logger,
      timingMetrics: this.walletConfig.metricsConfiguration.timingMetrics,
    });

    this.ledgerManager = LedgerManager.create({
      store: this.store,
      logger: this.logger,
      timingMetrics: this.walletConfig.metricsConfiguration.timingMetrics,
    });
  }
  /**
   * Adds an ethereum private key to the wallet's database
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
   * Registers any channels existing in the database with the chain service.
   *
   * @remarks
   * Enables the chain service to alert the wallet of of any blockchain events for existing channels.
   *
   * @returns A promise that resolves when the channels have been successfully registered.
   */
  private async registerExistingChannelsWithChainService(): Promise<void> {
    const channelsToRegister = (await this.store.getNonFinalizedChannels())
      .map(ChannelState.toChannelResult)
      .map(cr => ({
        assetHolderAddresses: cr.allocations.map(a => makeAddress(a.assetHolderAddress)),
        channelId: cr.channelId,
      }));

    for (const {channelId, assetHolderAddresses} of channelsToRegister) {
      this.chainService.registerChannel(channelId, assetHolderAddresses, this);
    }
  }

  /**
   * Pulls and stores the ForceMoveApp definition bytecode at the supplied blockchain address.
   *
   * @remarks
   * Storing the bytecode is necessary for the wallet to verify ForceMoveApp transitions.
   *
   * @param  appDefinition - An ethereum address where ForceMoveApp rules are deployed.
   * @returns A promise that resolves when the bytecode has been successfully stored.
   */
  public async registerAppDefinition(appDefinition: string): Promise<void> {
    const bytecode = await this.chainService.fetchBytecode(appDefinition);
    await this.store.upsertBytecode(
      utils.hexlify(this.walletConfig.networkConfiguration.chainNetworkID),
      makeAddress(appDefinition),
      bytecode
    );
  }

  /**
   * Stores the supplied ForceMoveApp definition bytecode against the supplied blockchain address.
   *
   * @remarks
   * Storing the bytecode is necessary for the wallet to verify ForceMoveApp transitions.
   *
   * @param  appDefinition - An ethereum address where ForceMoveApp rules are deployed.
   * @param  bytecode - The bytecode at that address.
   * @returns A promise that resolves when the bytecode has been successfully stored.
   */
  public async registerAppBytecode(appDefinition: string, bytecode: string): Promise<void> {
    return this.store.upsertBytecode(
      utils.hexlify(this.walletConfig.networkConfiguration.chainNetworkID),
      makeAddress(appDefinition),
      bytecode
    );
  }

  /**
   * Streamlines wallet output messsages.
   *
   * @remarks
   * Helps to enable more efficient messaging. Channel results are sorted and deduplicated. Messages to the same recipient are merged.
   *
   * @privateRemarks
   * TODO: Consider whether we need to make this method public (at time of writing, it is used only once in consuming code)
   * TODO: Is this method well named? "Merge" doesn't really do justice to what is going on. "Messages" is not in harmony with "Output[]".
   *
   * @param output - An array of output messages and channel results.
   * @returns A streamlined output of messages.
   */
  public static mergeOutputs(output: Output[]): MultipleChannelOutput {
    return WalletResponse.mergeOutputs(output);
  }

  /**
   * Destroy this wallet instance
   *
   * @remarks
   * Removes listeners from the chainService and destroys the wallet's database connection.
   *
   * @returns A promise that resolves when the wallet has been destroyed.
   */
  public async destroy(): Promise<void> {
    await this.knex.destroy();
    this.chainService.destructor();
  }

  /**
   * Trigger a response containing a message for counterparties, with all stored states for each a set of channels.
   *
   * @param channelIds - List of channel ids to be sync'ed
   * @returns A promise that resolves to an object containing the messages.
   */
  public async syncChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await Promise.all(channelIds.map(channelId => this._syncChannel(channelId, response)));

    return response.multipleChannelOutput();
  }

  /**
   * Trigger a response containing a message for all counterparties, with all stored states for a given channel.
   *
   * @param channelId - The channel id to be sync'ed
   * @returns A promise that resolves to an object containing the messages.
   */
  public async syncChannel({channelId}: SyncChannelParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();
    await this._syncChannel(channelId, response);
    return response.singleChannelOutput();
  }

  private async _syncChannel(channelId: string, response: WalletResponse): Promise<void> {
    const {states, channelState} = await this.store.getStates(channelId);

    const {myIndex, participants} = channelState;

    states.forEach(s => response.queueState(s, myIndex, channelId));

    response.queueChannelRequest(channelId, myIndex, participants);
    response.queueChannelState(channelState);

    if (await this.store.isLedger(channelId)) {
      const proposals = await this.store.getLedgerProposals(channelId);
      const [[mine]] = _.partition(proposals, [
        'signingAddress',
        participants[myIndex].signingAddress,
      ]);
      if (mine && mine.proposal)
        response.queueProposeLedgerUpdate(
          channelId,
          myIndex,
          participants,
          mine.proposal,
          mine.nonce
        );
    }
  }

  /**
   * Trigger an on-chain challenge.
   *
   * @param challengeState - The state to raise the challenge with.
   * @returns A promise that resolves to a channel output.
   */
  public async challenge(channelId: string): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

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

      const objective = await this.store.ensureObjective(
        {
          type: 'SubmitChallenge',
          participants: [],
          data: {targetChannelId: channelId},
        },
        tx
      );
      this.emit('objectiveStarted', objective);

      await this.store.approveObjective(objective.objectiveId, tx);

      response.queueChannel(channel);
    });

    await this.takeActions([channelId], response);
    // TODO: In v0 of challenging the challengeStatus on the channel will not be updated
    // We return a single channel result anwyays in case there are messages in the outbox
    return response.singleChannelOutput();
  }

  /**
   * Update the wallet's knowledge about the funding for some channels
   *
   * @param args - A list of objects, each specifying the channelId, asset holder address and amount.
   * @returns A promise that resolves to a channel output.
   */
  public async updateFundingForChannels(
    args: UpdateChannelFundingParams[]
  ): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await Promise.all(args.map(a => this._updateChannelFunding(a, response)));

    return response.multipleChannelOutput();
  }

  /**
   * Update the wallet's knowledge about the funding for a channel.
   *
   * @param args - An object specifying the channelId, asset holder address and amount.
   * @returns A promise that resolves to a channel output.
   */
  public async updateChannelFunding(
    args: UpdateChannelFundingParams
  ): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._updateChannelFunding(args, response);

    return response.singleChannelOutput();
  }

  private async _updateChannelFunding(
    {channelId, assetHolderAddress, amount}: UpdateChannelFundingParams,
    response: WalletResponse
  ): Promise<void> {
    await this.store.updateFunding(
      channelId,
      BN.from(amount),
      assetHolderAddress || makeAddress(constants.AddressZero)
    );

    await this.takeActions([channelId], response);
  }

  /**
   * Get the signing address for this wallet, or create it if it does not exist.
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
   * The channel will have a null app definition and null app data. This method is otherwise identical to {@link SingleThreadedWallet.createChannel}.
   *
   * @returns A promise that resolves to the channel output.
   */
  async createLedgerChannel(
    args: Pick<CreateChannelParams, 'participants' | 'allocations' | 'challengeDuration'>,
    fundingStrategy: 'Direct' | 'Fake' = 'Direct'
  ): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

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

    return response.singleChannelOutput();
  }
  /**
   * Creates a channel.
   *
   * @remarks
   * The channel's nonce will be automatically chosen.
   * The channel will be registered with the wallet's chain service.
   * The 0th state will be created and signed.
   * An OpenChannel objective will be created and approved.
   *
   * @param args - Parameters to create the channel with.
   * @returns A promise that resolves to the channel output.
   */
  async createChannel(args: CreateChannelParams): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._createChannel(response, args, 'app');

    return response.multipleChannelOutput();
  }
  /**
   * Creates multiple channels with the same parameters. See {@link SingleThreadedWallet.createChannel}.
   *
   * @param args - Parameters to create the channels with.
   * @param numberOfChannels - The number of desired channels.
   * @returns A promise that resolves to the channel output.
   */
  async createChannels(
    args: CreateChannelParams,
    numberOfChannels: number
  ): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    await Promise.all(
      _.range(numberOfChannels).map(() => this._createChannel(response, args, 'app'))
    );

    return response.multipleChannelOutput();
  }

  private async _createChannel(
    response: WalletResponse,
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
      chainId: BigNumber.from(this.walletConfig.networkConfiguration.chainNetworkID).toHexString(),
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

    this.emit('objectiveStarted', objective);
    response.queueState(signedState, channel.myIndex, channel.channelId);
    response.queueCreatedObjective(objective, channel.myIndex, channel.participants);
    response.queueChannelState(channel);

    this.registerChannelWithChainService(channel.channelId);

    return channel.channelId;
  }

  /**
   * Joins a list of channels.
   *
   * @remarks
   * Approves an OpenChannel objective for each channel, if it exists, and cranks it.
   * Registers each channel with the wallet's chain service.
   *
   * @param channelIds - The list of ids of the channels to join.
   * @returns A promise that resolves to the channel output.
   */
  async joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();
    const objectives = await this.store.getObjectives(channelIds);

    await Promise.all(
      objectives.map(
        async ({type, objectiveId}) =>
          type === 'OpenChannel' && (await this.store.approveObjective(objectiveId))
      )
    );

    await this.takeActions(channelIds, response);

    await Promise.all(channelIds.map(id => this.registerChannelWithChainService(id)));

    return response.multipleChannelOutput();
  }

  /**
   * Joins a channel.
   *
   * @remarks
   * Approves an OpenChannel objective for this channel, if it exists, and cranks it.
   * Registers the channel with the wallet's chain service.
   * Throws an error if the channel is not known to this wallet.
   * Throws an error if no objectives are known that have this channel in scope.
   *
   * @param channelId - The id of the channel to join.
   * @returns A promise that resolves to the channel output.
   */
  async joinChannel({channelId}: JoinChannelParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();
    const channel = await this.store.getChannelState(channelId);

    if (!channel)
      throw new JoinChannel.JoinChannelError(
        JoinChannel.JoinChannelError.reasons.channelNotFound,
        channelId
      );

    const objectives = await this.store.getObjectives([channelId]);

    if (objectives.length === 0)
      throw new Error(`Could not find objective for channel ${channelId}`);

    if (objectives[0].type === 'OpenChannel')
      await this.store.approveObjective(objectives[0].objectiveId);

    await this.takeActions([channelId], response);

    this.registerChannelWithChainService(channelId);

    // set strict=false to silently drop any ledger channel updates from channelResults
    // TODO: change api so that joinChannel returns a MultipleChannelOutput
    return response.singleChannelOutput(false);
  }

  /**
   * Updates a channel with a new state.
   *
   * @remarks
   * Signs and stores the new state, returns the result in a message for counterparties.
   * Throws an error if the channel is not known to this wallet.
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
      this.walletConfig.metricsConfiguration.timingMetrics,
      `updateChannel ${channelId}`
    );
    const handleMissingChannel: MissingAppHandler<Promise<SingleChannelOutput>> = () => {
      throw new UpdateChannel.UpdateChannelError(
        UpdateChannel.UpdateChannelError.reasons.channelNotFound,
        {channelId}
      );
    };
    const criticalCode: AppHandler<Promise<SingleChannelOutput>> = async (tx, channel) => {
      const response = WalletResponse.initialize();
      const {myIndex} = channel;

      const outcome = recordFunctionMetrics(
        deserializeAllocations(allocations),
        this.walletConfig.metricsConfiguration.timingMetrics
      );

      const nextState = getOrThrow(
        recordFunctionMetrics(
          UpdateChannel.updateChannel({channelId, appData, outcome}, channel.protocolState),
          this.walletConfig.metricsConfiguration.timingMetrics
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
   * Creates, approves and cranks a CloseChannel objective for each channel in the list. See {@link SingleThreadedWallet.closeChannel}.
   *
   * @param channelId - The id of the channel to try and close.
   * @returns A promise that resolves to the channel output.
   */
  async closeChannels(channelIds: Bytes32[]): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

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
   * @returns A promise that resolves to the channel output.
   */
  async closeChannel({channelId}: CloseChannelParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

    await this._closeChannel(channelId, response);
    await this.takeActions([channelId], response);

    return response.singleChannelOutput();
  }

  private async _closeChannel(channelId: Bytes32, response: WalletResponse): Promise<void> {
    await this.objectiveManager.commenceCloseChannel(channelId, response);
  }

  /**
   * Gets the latest state for each ledger channel in the wallet's store.
   *
   * @param assetHolderAddress - The on chain address of an asset holder contract funding the ledger channels (filters the query).
   * @param participants - The list of participants in the ledger channel (filters the query).
   * @returns A promise that resolves to the channel output.
   */
  async getLedgerChannels(
    assetHolderAddress: string,
    participants: APIParticipant[]
  ): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    const channelStates = await this.store.getLedgerChannels(
      assetHolderAddress,
      participants.map(convertToParticipant)
    );

    channelStates.forEach(cs => response.queueChannelState(cs));

    return response.multipleChannelOutput();
  }

  /**
   * Gets the latest state for each channel in the wallet's store.
   *
   * @returns A promise that resolves to the channel output.
   */
  async getChannels(): Promise<MultipleChannelOutput> {
    const response = WalletResponse.initialize();

    const channelStates = await this.store.getChannels();
    channelStates.forEach(cs => response.queueChannelState(cs));

    return response.multipleChannelOutput();
  }

  /**
   * Gets the objective for a given id.
   *
   * @returns A promise that resolves to a DBObjective, with a progressLastMadeAt timestamp
   */
  async getObjective(objectiveId: string): Promise<DBObjective> {
    return this.store.getObjective(objectiveId);
  }

  /**
   * Gets the latest state for a channel.
   *
   * @privateRemarks TODO: Consider renaming this to getChannel() to match getChannels()
   * @returns A promise that resolves to the channel output.
   */
  async getState({channelId}: GetStateParams): Promise<SingleChannelOutput> {
    const response = WalletResponse.initialize();

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
   * Push a message from a counterparty into the wallet.
   *
   * @remarks
   * Fresh states and Ledger Proposals will be stored.
   * Requests will be handled.
   * Objectives with updated channels in scope will be cranked.
   *
   * @param rawPayload - The message to be pushed. Will be validated against a schema.
   * @returns A promise that resolves to the channel output.
   */
  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    const wirePayload = validatePayload(rawPayload);

    const response = WalletResponse.initialize();

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

    const response = WalletResponse.initialize();

    await SingleAppUpdater.create(this.store).update(wirePayload, response);

    return response.singleChannelOutput();
  }

  private async _pushMessage(wirePayload: WirePayload, response: WalletResponse): Promise<void> {
    const store = this.store;

    const {
      channelIds: channelIdsFromStates,
      channelResults: fromStoring,
    } = await this.store.pushMessage(wirePayload);

    const channelIdsFromRequests: Bytes32[] = [];
    const requests = (wirePayload.requests || []).map(deserializeRequest);

    for (const request of requests) {
      const {channelId} = request;

      channelIdsFromRequests.push(channelId);

      switch (request.type) {
        case 'GetChannel': {
          const {states: signedStates, channelState} = await store.getStates(channelId);

          // add signed states to response
          signedStates.forEach(s => response.queueState(s, channelState.myIndex, channelId));

          if (await this.store.isLedger(channelId)) {
            const proposals = await this.store.getLedgerProposals(channelId);

            const [[mine]] = _.partition(proposals, [
              'signingAddress',
              channelState.participants[channelState.myIndex].signingAddress,
            ]);

            if (mine && mine.proposal)
              response.queueProposeLedgerUpdate(
                channelId,
                channelState.myIndex,
                channelState.participants,
                mine.proposal,
                mine.nonce
              );
          }

          continue;
        }
        case 'ProposeLedgerUpdate':
          await store.storeLedgerProposal(
            channelId,
            request.outcome,
            request.nonce,
            request.signingAddress
          );
          continue;
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
   * @param response WalletResponse that is modified in place while cranking objectives
   */
  private async takeActions(channels: Bytes32[], response: WalletResponse): Promise<void> {
    let needToCrank = true;
    while (needToCrank) {
      await this.crankUntilIdle(channels, response);
      needToCrank = await this.processLedgerQueue(channels, response);
    }

    response.succeededObjectives.map(o => this.emit('objectiveSucceeded', o));
  }

  private async processLedgerQueue(
    channels: Bytes32[],
    response: WalletResponse
  ): Promise<boolean> {
    let requiresAnotherCrankUponCompletion = false;

    // Fetch ledger channels related to the channels argument where related means, either:
    // - The ledger channel is in the channels array
    // - The ledger channel is funding one of the channels in the channels array
    const ledgerIdsFundingChannels = await this.store.getLedgerChannelIdsFundingChannels(channels);
    const ledgerIdsFromChannels = await this.store.filterChannelIdsByIsLedger(channels);

    const ledgersToProcess = _.uniq(ledgerIdsFromChannels.concat(ledgerIdsFundingChannels));

    for (const ledgerChannelId of ledgersToProcess) {
      const result = await this.ledgerManager.crank(ledgerChannelId, response).catch(err => {
        // We log and swallow errors thrown during cranking
        // So that the wallet can continue processing other ledger channels.
        // TODO review this choice
        // https://github.com/statechannels/statechannels/pull/3169#issuecomment-763637894
        this.logger.error({err}, `Error cranking ledger channel ${ledgerChannelId}`);
        return false;
      });
      requiresAnotherCrankUponCompletion = requiresAnotherCrankUponCompletion || result;
    }

    return requiresAnotherCrankUponCompletion;
  }

  // todo(tom): change function to return a value instead of mutating input args
  private async crankUntilIdle(channels: Bytes32[], response: WalletResponse): Promise<void> {
    // Fetch channels related to the channels argument where related means, either:
    // - The channel is in the channels array
    // - The channel is being funded by one of the channels in the channels array
    const channelsWithRelevantPendingReqs = await this.store.getChannelIdsPendingLedgerFundingFrom(
      channels
    );

    const objectives = (
      await this.store.getObjectives(channels.concat(channelsWithRelevantPendingReqs))
    ).filter(objective => objective.status === 'approved');

    // todo(tom): why isn't this just a for loop?
    while (objectives.length) {
      const objective = objectives[0];

      await this.objectiveManager.crank(objective.objectiveId, response);

      // remove objective from list
      objectives.shift();
    }
  }

  // ChainEventSubscriberInterface implementation
  async holdingUpdated({channelId, amount, assetHolderAddress}: HoldingUpdatedArg): Promise<void> {
    const response = WalletResponse.initialize();

    await this.store.updateFunding(channelId, BN.from(amount), assetHolderAddress);
    await this.takeActions([channelId], response);

    response.channelUpdatedEvents().forEach(event => this.emit('channelUpdated', event.value));
  }

  async assetOutcomeUpdated({
    channelId,
    assetHolderAddress,
    externalPayouts,
  }: AssetOutcomeUpdatedArg): Promise<void> {
    const response = WalletResponse.initialize();
    const transferredOut = externalPayouts.map(ai => ({
      toAddress: makeDestination(ai.destination),
      amount: ai.amount,
    }));

    await this.store.updateTransferredOut(channelId, assetHolderAddress, transferredOut);

    await this.takeActions([channelId], response);

    response.channelUpdatedEvents().forEach(event => this.emit('channelUpdated', event.value));
  }

  async challengeRegistered(arg: ChallengeRegisteredArg): Promise<void> {
    const response = WalletResponse.initialize();
    const {channelId, finalizesAt: finalizedAt, challengeStates} = arg;

    await this.store.insertAdjudicatorStatus(channelId, finalizedAt, challengeStates);
    await this.takeActions([arg.channelId], response);
    response.channelUpdatedEvents().forEach(event => this.emit('channelUpdated', event.value));
  }

  async channelFinalized(arg: ChannelFinalizedArg): Promise<void> {
    const response = WalletResponse.initialize();

    await this.store.markAdjudicatorStatusAsFinalized(
      arg.channelId,
      arg.blockNumber,
      arg.blockTimestamp
    );
    await this.knex.transaction(async tx => {
      const objective = await this.store.ensureObjective(
        {
          type: 'DefundChannel',
          participants: [],
          data: {targetChannelId: arg.channelId},
        },
        tx
      );
      this.emit('objectiveStarted', objective);
      await this.store.approveObjective(objective.objectiveId, tx);
    });

    await this.takeActions([arg.channelId], response);
    response.channelUpdatedEvents().forEach(event => this.emit('channelUpdated', event.value));
  }

  private async registerChannelWithChainService(channelId: string): Promise<void> {
    const channel = await this.store.getChannelState(channelId);
    const channelResult = ChannelState.toChannelResult(channel);

    const assetHolderAddresses = channelResult.allocations.map(a =>
      makeAddress(a.assetHolderAddress)
    );
    this.chainService.registerChannel(channelId, assetHolderAddresses, this);
  }
}

// TODO: This should be removed, and not used externally.
// It is a fill-in until the wallet API is specced out.
export function getOrThrow<E, T>(result: Either.Either<E, T>): T {
  return Either.getOrElseW<E, T>(
    (err: E): T => {
      throw err;
    }
  )(result);
}
