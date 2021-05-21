import {CreateChannelParams, Message} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {
  MessageHandler,
  MessageServiceFactory,
  MessageServiceInterface,
} from '../message-service/types';
import {getMessages} from '../message-service/utils';
import {WalletObjective} from '../models/objective';
import {Engine, SyncObjectiveResult} from '../engine';

import {RetryOptions, ObjectiveResult, ObjectiveError, ObjectiveSuccess} from './types';

export const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const DEFAULTS: RetryOptions = {numberOfAttempts: 10, multiple: 2, initialDelay: 50};
export class Wallet {
  /**
   * Constructs a channel manager that will ensure objectives get accomplished by resending messages if needed.
   * @param engine The engine to use.
   * @param messageService  The message service to use.
   * @param retryOptions How often and for how long the channel manager should retry objectives.
   * @returns A channel manager.
   */
  public static async create(
    engine: Engine,
    messageServiceFactory: MessageServiceFactory,
    retryOptions: Partial<RetryOptions> = DEFAULTS
  ): Promise<Wallet> {
    return new Wallet(messageServiceFactory, engine, {...DEFAULTS, ...retryOptions});
  }

  private _messageService: MessageServiceInterface;

  private constructor(
    messageServiceFactory: MessageServiceFactory,
    private _engine: Engine,
    private _retryOptions: RetryOptions
  ) {
    const handler: MessageHandler = async message => {
      const {outbox} = await this._engine.pushMessage(message.data);

      await this.messageService.send(getMessages(outbox));
    };

    this._messageService = messageServiceFactory(handler);
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
      let isComplete = false;

      const onObjectiveSucceeded = (o: WalletObjective) => {
        if (objective.objectiveId === o.objectiveId) {
          isComplete = true;
        }
      };

      this._engine.on('objectiveSucceeded', onObjectiveSucceeded);

      // Now that we're listening for objective success we can now send messages
      // that might trigger progress on the objective

      await this._messageService.send(objectiveMessages);

      /**
       * Consult https://github.com/statechannels/statechannels/issues/3518 for background on this retry logic
       */
      const {multiple, initialDelay, numberOfAttempts} = this._retryOptions;
      for (let i = 0; i < numberOfAttempts; i++) {
        if (isComplete) return {channelId: objective.data.targetChannelId, type: 'Success'};
        const delayAmount = initialDelay * Math.pow(multiple, i);

        await delay(delayAmount);

        const syncResult = await this._engine.syncObjectives([objective.objectiveId]);

        const messagesForObjective = this.getMessagesForObjective(
          objective.objectiveId,
          syncResult
        );

        await this._messageService.send(messagesForObjective);
      }
      if (isComplete) return {channelId: objective.data.targetChannelId, type: 'Success'};
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

  async destroy(): Promise<void> {
    await this._messageService.destroy();
    await this._engine.destroy();
  }
}
