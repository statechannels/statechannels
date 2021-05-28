import {CreateChannelParams, Message} from '@statechannels/client-api-schema';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import {makeAddress} from '@statechannels/wallet-core';
import {utils} from 'ethers';

import {
  MessageHandler,
  MessageServiceFactory,
  MessageServiceInterface,
} from '../message-service/types';
import {getMessages} from '../message-service/utils';
import {WalletObjective} from '../models/objective';
import {Engine, SyncObjectiveResult} from '../engine';
import {ChainServiceInterface} from '../chain-service';
import * as ChannelState from '../protocols/state';

import {
  RetryOptions,
  ObjectiveResult,
  ObjectiveError,
  ObjectiveSuccess,
  ObjectiveProposed,
} from './types';
import {createChainListener} from './chain-listener';

export const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const DEFAULTS: RetryOptions = {numberOfAttempts: 10, multiple: 2, initialDelay: 50};
export class Wallet extends EventEmitter<ObjectiveProposed> {
  /**
   * Constructs a channel manager that will ensure objectives get accomplished by resending messages if needed.
   * @param engine The engine to use.
   * @param messageService  The message service to use.
   * @param retryOptions How often and for how long the channel manager should retry objectives.
   * @returns A channel manager.
   */
  public static async create(
    engine: Engine,
    chainService: ChainServiceInterface,
    messageServiceFactory: MessageServiceFactory,
    retryOptions: Partial<RetryOptions> = DEFAULTS
  ): Promise<Wallet> {
    await chainService.checkChainId(engine.engineConfig.networkConfiguration.chainNetworkID);
    const wallet = new Wallet(messageServiceFactory, engine, chainService, {
      ...DEFAULTS,
      ...retryOptions,
    });
    await wallet.registerExistingChannelsWithChainService();
    return wallet;
  }

  private _messageService: MessageServiceInterface;
  private _destroyed = false;

  private constructor(
    messageServiceFactory: MessageServiceFactory,
    private _engine: Engine,
    private _chainService: ChainServiceInterface,
    private _retryOptions: RetryOptions
  ) {
    super();

    const handler: MessageHandler = async message => {
      const {outbox, newObjectives, channelResults} = await this._engine.pushMessage(message.data);
      // Receiving messages from other participants may have resulted in new proposed objectives
      for (const o of newObjectives) {
        this.emit('ObjectiveProposed', o);

        // If this is a new open channel objective that means there is a new channel to be monitored in the chain service
        if (o.type === 'OpenChannel') {
          const listener = createChainListener(
            this._engine,
            this._engine.store,
            this.messageService
          );
          const assetHolders = _.uniq(
            _.flatten(channelResults.map(cr => cr.allocations.map(a => a.assetHolderAddress))).map(
              makeAddress
            )
          );
          this._chainService.registerChannel(o.data.targetChannelId, assetHolders, listener);
        }
      }
      await this.messageService.send(getMessages(outbox));
    };

    this._messageService = messageServiceFactory(handler);
  }
  /**
   * Pulls and stores the ForceMoveApp definition bytecode at the supplied blockchain address.
   *
   * @remarks
   * Storing the bytecode is necessary for the engine to verify ForceMoveApp transitions.
   *
   * @param  appDefinition - An ethereum address where ForceMoveApp rules are deployed.
   * @returns A promise that resolves when the bytecode has been successfully stored.
   */
  public async registerAppDefinition(appDefinition: string): Promise<void> {
    const bytecode = await this._chainService.fetchBytecode(appDefinition);
    await this._engine.store.upsertBytecode(
      utils.hexlify(this._engine.engineConfig.networkConfiguration.chainNetworkID),
      makeAddress(appDefinition),
      bytecode
    );
  }
  /**
   * Approves an objective that has been proposed by another participant.
   * Once the objective has been approved progress can be made to completing the objective.
   * @remarks
   * This is used to "join" channels by approving a CreateChannel Objective.
   * @param objectiveIds The ids of the objective you want to approve.
   * @returns A promise that resolves to a collection of ObjectiveResult.
   */
  public async approveObjectives(objectiveIds: string[]): Promise<ObjectiveResult[]> {
    const {objectives, messages} = await this._engine.approveObjectives(objectiveIds);
    return Promise.all(
      objectives.map(async o => ({
        objectiveId: o.objectiveId,
        currentStatus: o.status,
        channelId: o.data.targetChannelId,
        done: this.ensureObjective(o, messages),
      }))
    );
  }

  /**
   Creates channels using the given parameters.
   * @param channelParameters The parameters to use for channel creation. A channel will be created for each entry in the array.
   * @returns A promise that resolves to a collection of ObjectiveResult.
   */
  public async createChannels(
    channelParameters: CreateChannelParams[]
  ): Promise<ObjectiveResult[]> {
    return Promise.all(
      channelParameters.map(async p => {
        try {
          const createResult = await this._engine.createChannel(p);
          const assetHolders = createResult.channelResult.allocations.map(a =>
            makeAddress(a.assetHolderAddress)
          );
          const listener = createChainListener(
            this._engine,
            this._engine.store,
            this.messageService
          );
          this._chainService.registerChannel(
            createResult.channelResult.channelId,
            assetHolders,
            listener
          );

          const {newObjective, channelResult} = createResult;

          return {
            channelId: channelResult.channelId,
            currentStatus: newObjective.status,
            objectiveId: newObjective.objectiveId,
            done: this.ensureObjective(newObjective, getMessages(createResult)),
          };
        } catch (error) {
          // TODO: This is slightly hacky but it's less painful then having to narrow the type down every time
          // you get a result back from the createChannels method
          // This should be looked at in https://github.com/statechannels/statechannels/issues/3461
          return {
            channelId: 'ERROR',
            currentStatus: 'failed' as const,
            objectiveId: 'ERROR',
            done: Promise.resolve({type: 'InternalError' as const, error}),
          };
        }
      })
    );
  }

  /**
   Closes the specified channels
   * @param channelIds The ids of the channels to close.
   * @returns A promise that resolves to a collection of ObjectiveResult.
   */
  public async closeChannels(channelIds: string[]): Promise<ObjectiveResult[]> {
    return Promise.all(
      channelIds.map(async channelId => {
        const closeResult = await this._engine.closeChannel({channelId});

        const {newObjective, channelResult} = closeResult;
        // TODO: We just refetch to get the latest status
        // Long term we should make sure the engine returns the latest objectives
        const latest = await this._engine.getObjective(newObjective.objectiveId);
        return {
          channelId: channelResult.channelId,
          currentStatus: latest.status,
          objectiveId: newObjective.objectiveId,
          done: this.ensureObjective(latest, getMessages(closeResult)),
        };
      })
    );
  }

  /**
   * Finds any approved objectives and attempts to make progress on them.
   * This is useful for restarting progress after a restart or crash.
   * @returns A collection of ObjectiveResults. There will be an ObjectiveResult for each approved objective found.
   */
  public async jumpStartObjectives(): Promise<ObjectiveResult[]> {
    const objectives = await this._engine.getApprovedObjectives();
    const objectiveIds = objectives.map(o => o.objectiveId);
    // Instead of getting messages per objective we just get them all at once
    // This will prevent us from querying the database for each objective

    const syncMessages = await this._engine.syncObjectives(objectiveIds);

    return Promise.all(
      objectives.map(async o => {
        const messagesForObjective = syncMessages.messagesByObjective[o.objectiveId];
        return {
          objectiveId: o.objectiveId,
          currentStatus: o.status,
          channelId: o.data.targetChannelId,
          done: this.ensureObjective(o, messagesForObjective),
        };
      })
    );
  }

  /**
   * Ensures that the provided objectives get completed.
   * Will resend messages as required to ensure that the objectives get completed.
   * This should never throw an exception. Instead it should return an ObjectiveError
   * @param objectives The list of objectives to ensure get completed.
   * @param objectiveMessages The collection of outgoing messages related to the objective.
   * @returns A promise that resolves when all the objectives are completed
   */
  private async ensureObjective(
    objective: WalletObjective,
    objectiveMessages: Message[]
  ): Promise<ObjectiveSuccess | ObjectiveError> {
    try {
      // If the objective is already done we want to exit immediately
      if (objective.status === 'succeeded') {
        this._engine.logger.debug(
          {objective},
          'Objective passed into ensureObjective has already succeeded'
        );
        return {type: 'Success', channelId: objective.data.targetChannelId};
      }

      // Now that we're listening for objective success we can now send messages
      // that might trigger progress on the objective

      await this._messageService.send(objectiveMessages);

      /**
       * Consult https://github.com/statechannels/statechannels/issues/3518 for background on this retry logic
       */
      const {multiple, initialDelay, numberOfAttempts} = this._retryOptions;
      const isComplete = async () => this._engine.store.isObjectiveComplete(objective.objectiveId);
      for (let i = 0; i < numberOfAttempts; i++) {
        if (await isComplete()) {
          return {channelId: objective.data.targetChannelId, type: 'Success'};
        }
        const delayAmount = initialDelay * Math.pow(multiple, i);

        await delay(delayAmount);

        const syncResult = await this._engine.syncObjectives([objective.objectiveId]);

        const messagesForObjective = this.getMessagesForObjective(
          objective.objectiveId,
          syncResult
        );

        await this._messageService.send(messagesForObjective);
      }

      if (await isComplete()) {
        return {channelId: objective.data.targetChannelId, type: 'Success'};
      }
      return {numberOfAttempts: this._retryOptions.numberOfAttempts, type: 'EnsureObjectiveFailed'};
    } catch (error) {
      this._engine.logger.error({err: error}, 'Uncaught error in EnsureObjective');
      return {
        type: 'InternalError' as const,
        error,
      };
    }
  }

  /**
   * Gets a message for a specific objective from a SyncObjectiveResult
   * Throws if there are additional messages or the message is missing
   */
  private getMessagesForObjective(objectiveId: string, result: SyncObjectiveResult) {
    const objectiveIds = Object.keys(result.messagesByObjective);
    if (!objectiveIds.includes(objectiveId)) {
      throw new Error(`No messages for objective ${objectiveId}`);

      // This is a sanity check to prevent us from losing messages
    } else if (objectiveIds.length !== 1) {
      throw new Error(`There are messages for multiple objectives ${objectiveIds}`);
    }

    return result.messagesByObjective[objectiveId];
  }

  public get messageService(): MessageServiceInterface {
    return this._messageService;
  }

  /**
   * Registers any channels existing in the database with the chain service.
   *
   * @remarks
   * Enables the chain service to alert the engine of of any blockchain events for existing channels.
   *
   * @returns A promise that resolves when the channels have been successfully registered.
   */
  private async registerExistingChannelsWithChainService(): Promise<void> {
    const channelsToRegister = (await this._engine.store.getNonFinalizedChannels())
      .map(ChannelState.toChannelResult)
      .map(cr => ({
        assetHolderAddresses: cr.allocations.map(a => makeAddress(a.assetHolderAddress)),
        channelId: cr.channelId,
      }));

    for (const {channelId, assetHolderAddresses} of channelsToRegister) {
      this._chainService.registerChannel(
        channelId,
        assetHolderAddresses,
        createChainListener(this._engine, this._engine.store, this._messageService)
      );
    }
  }

  async destroy(): Promise<void> {
    this._chainService.destructor();
    await this._messageService.destroy();
    await this._engine.destroy();
  }
}
