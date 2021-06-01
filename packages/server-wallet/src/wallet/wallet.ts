import {CreateChannelParams, Message, Uint256} from '@statechannels/client-api-schema';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';
import {makeAddress, makeDestination} from '@statechannels/wallet-core';
import {providers, utils} from 'ethers';

import {
  MessageHandler,
  MessageServiceFactory,
  MessageServiceInterface,
} from '../message-service/types';
import {getMessages} from '../message-service/utils';
import {WalletObjective} from '../models/objective';
import {
  Engine,
  hasNewObjective,
  isMultipleChannelOutput,
  MultipleChannelOutput,
  SingleChannelOutput,
  SyncObjectiveResult,
} from '../engine';
import {ChainEventSubscriberInterface, ChainServiceInterface} from '../chain-service';
import * as ChannelState from '../protocols/state';

import {
  RetryOptions,
  ObjectiveResult,
  ObjectiveError,
  ObjectiveSuccess,
  WalletEvents,
  ObjectiveDoneResult,
} from './types';

export const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const DEFAULTS: RetryOptions = {numberOfAttempts: 10, multiple: 2, initialDelay: 50};
export class Wallet extends EventEmitter<WalletEvents> {
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

  private constructor(
    messageServiceFactory: MessageServiceFactory,
    private _engine: Engine,
    private _chainService: ChainServiceInterface,
    private _retryOptions: RetryOptions
  ) {
    super();

    const handler: MessageHandler = async message => {
      const result = await this._engine.pushMessage(message.data);
      const {newObjectives, channelResults, completedObjectives} = result;
      for (const o of completedObjectives) {
        if (o.type === 'CloseChannel') {
          this._engine.logger.trace({objective: o}, 'Objective completed');
          this.emit('ObjectiveCompleted', o);
        }
      }
      for (const o of newObjectives) {
        // If this is a new open channel objective that means there is a new channel to be monitored in the chain service
        if (o.type === 'OpenChannel') {
          const listener = this.createChainListener(o.data.targetChannelId);
          const assetHolders = _.uniq(
            _.flatten(channelResults.map(cr => cr.allocations.map(a => a.assetHolderAddress))).map(
              makeAddress
            )
          );
          this._chainService.registerChannel(o.data.targetChannelId, assetHolders, listener);
        }
      }

      await this.handleEngineOutput(result);
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
    const {objectives, messages, chainRequests} = await this._engine.approveObjectives(
      objectiveIds
    );

    // Emit for any succeed objectives
    const completedObjectives = objectives.filter(o => o.status === 'succeeded');
    completedObjectives.forEach(o => this.emit('ObjectiveCompleted', o));

    const transactions = await this._chainService.handleChainRequests(chainRequests);
    await Promise.all(transactions.map(tr => tr.wait()));
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
          const listener = this.createChainListener(createResult.channelResult.channelId);
          this._chainService.registerChannel(
            createResult.channelResult.channelId,
            assetHolders,
            listener
          );

          const {newObjective, channelResult} = createResult;
          await this.handleEngineOutput(createResult);
          return {
            channelId: channelResult.channelId,
            currentStatus: newObjective.status,
            objectiveId: newObjective.objectiveId,
            done: this.ensureObjective(newObjective, getMessages(createResult)),
          };
        } catch (error) {
          this._engine.logger.error({err: error}, 'Uncaught InternalError in CreateChannel');
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
        // TODO: This currently is skipping the ensureObjective logic
        // Using ensureObjectives seems to keep executing AFTER destroy has been called
        // Still need to figure this out
        const done: Promise<ObjectiveDoneResult> = new Promise(resolve =>
          this.on('ObjectiveCompleted', (o: WalletObjective) => {
            if (
              o.type === 'CloseChannel' &&
              o.data.targetChannelId === channelId &&
              o.status === 'succeeded'
            ) {
              this._engine.logger.trace({objective: o}, 'Objective Suceeded');
              resolve({type: 'Success', channelId});
            }
          })
        );

        const closeResult = await this._engine.closeChannel({channelId});
        const {newObjective, channelResult} = closeResult;

        // TODO: We just refetch to get the latest status
        // Long term we should make sure the engine returns the latest objectives
        const latest = await this._engine.getObjective(newObjective.objectiveId);
        await this.handleEngineOutput(closeResult);

        return {
          channelId: channelResult.channelId,
          currentStatus: latest.status,
          objectiveId: newObjective.objectiveId,
          done,
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
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      try {
        // If the objective is already done we want to exit immediately
        if (objective.status === 'succeeded') {
          this._engine.logger.debug(
            {objective},
            'Objective passed into ensureObjective has already succeeded'
          );
          resolve({type: 'Success', channelId: objective.data.targetChannelId});
        }
        let isComplete = false;
        this.on('ObjectiveCompleted', (o: WalletObjective) => {
          if (o.objectiveId == objective.objectiveId && o.status === 'succeeded') {
            isComplete = true;
            resolve({type: 'Success', channelId: objective.data.targetChannelId});
          }
        });
        // Now that we're listening for objective success we can now send messages
        // that might trigger progress on the objective

        await this._messageService.send(objectiveMessages);

        /**
         * Consult https://github.com/statechannels/statechannels/issues/3518 for background on this retry logic
         */
        const {multiple, initialDelay, numberOfAttempts} = this._retryOptions;

        for (let i = 0; i < numberOfAttempts; i++) {
          if (isComplete) {
            resolve({channelId: objective.data.targetChannelId, type: 'Success'});
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

        if (isComplete) {
          resolve({channelId: objective.data.targetChannelId, type: 'Success'});
        }
        resolve({
          numberOfAttempts: this._retryOptions.numberOfAttempts,
          type: 'EnsureObjectiveFailed',
        });
      } catch (error) {
        this._engine.logger.error({err: error, objective}, 'Uncaught error in EnsureObjective');
        resolve({
          type: 'InternalError' as const,
          error,
        });
      }
    });
  }

  private emitObjectiveEvents(result: MultipleChannelOutput | SingleChannelOutput): void {
    if (isMultipleChannelOutput(result)) {
      // Receiving messages from other participants may have resulted in completed objectives
      for (const o of result.completedObjectives) {
        this.emit('ObjectiveCompleted', o);
      }

      // Receiving messages from other participants may have resulted in new proposed objectives
      for (const o of result.newObjectives) {
        if (o.status === 'pending') {
          this.emit('ObjectiveProposed', o);
        }
      }
    } else {
      if (hasNewObjective(result)) {
        if (result.newObjective.status === 'pending') {
          this.emit('ObjectiveProposed', result.newObjective);
        }
      }
    }
  }

  /**
   * Waits for the transactions.wait() promise to resolve on all transaction responses.
   * @param response
   */
  private async waitForTransactions(
    response: Promise<providers.TransactionResponse[]>
  ): Promise<void> {
    const transactions = await response;
    await Promise.all(transactions.map(tr => tr.wait()));
  }

  /**
   * Emits events, sends messages and requests transactions based on the output of the engine.
   * @param output
   */
  private async handleEngineOutput(
    output: MultipleChannelOutput | SingleChannelOutput
  ): Promise<void> {
    this.emitObjectiveEvents(output);
    await this._messageService.send(getMessages(output));
    await this.waitForTransactions(this._chainService.handleChainRequests(output.chainRequests));
  }

  /**
   * Creates a listener that will be subscribed to the chain service.
   * It creates a listener for a specific channel id.
   * @param channelIdToListenFor The channel Id the listener is for
   * @returns A chain event subscriber that can be passed into the chain service.
   */
  private createChainListener(channelIdToListenFor: string): ChainEventSubscriberInterface {
    return {
      holdingUpdated: async ({channelId, amount, assetHolderAddress}) => {
        if (channelId !== channelIdToListenFor) return;

        this._engine.logger.trace({channelId, amount}, 'holdingUpdated');
        try {
          await this._engine.store.updateFunding(channelId, amount, assetHolderAddress);
          const result = await this._engine.crank([channelId]);
          await this.handleEngineOutput(result);
        } catch (err) {
          this._engine.logger.error(err, 'holdingUpdated error');
          throw err;
        }
      },
      assetOutcomeUpdated: async ({channelId, assetHolderAddress, externalPayouts}) => {
        try {
          if (channelId !== channelIdToListenFor) return;

          this._engine.logger.trace(
            {channelId, assetHolderAddress, externalPayouts},
            'assetOutcomeUpdated'
          );
          const transferredOut = externalPayouts.map(ai => ({
            toAddress: makeDestination(ai.destination),
            amount: ai.amount as Uint256,
          }));

          await this._engine.store.updateTransferredOut(
            channelId,
            assetHolderAddress,
            transferredOut
          );
          const result = await this._engine.crank([channelId]);
          await this.handleEngineOutput(result);
        } catch (err) {
          this._engine.logger.error(err, 'assetOutcomeUpdated error');
          throw err;
        }
      },
      challengeRegistered: async ({channelId, finalizesAt: finalizedAt, challengeStates}) => {
        try {
          if (channelId !== channelIdToListenFor) return;
          this._engine.logger.trace(
            {channelId, finalizedAt, challengeStates},
            'challengeRegistered'
          );
          await this._engine.store.insertAdjudicatorStatus(channelId, finalizedAt, challengeStates);
          const result = await this._engine.crank([channelId]);
          await this.handleEngineOutput(result);
        } catch (err) {
          this._engine.logger.error(err, 'challengeRegistered error');
          throw err;
        }
      },
      channelFinalized: async ({channelId, blockNumber, blockTimestamp, finalizedAt}) => {
        try {
          if (channelId !== channelIdToListenFor) return;

          this._engine.logger.trace(
            {channelId, blockNumber, blockTimestamp, finalizedAt},
            'channelFinalized'
          );

          await this._engine.store.markAdjudicatorStatusAsFinalized(
            channelId,
            blockNumber,
            blockTimestamp,
            finalizedAt
          );
          const result = await this._engine.crank([channelId]);
          await this.handleEngineOutput(result);
        } catch (err) {
          this._engine.logger.error(err, 'channelFinalized error');
          throw err;
        }
      },
    };
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
        this.createChainListener(channelId)
      );
    }
  }

  async destroy(): Promise<void> {
    this._chainService.destructor();
    await this._messageService.destroy();
    await this._engine.destroy();
  }
}
