import {CreateChannelParams, Message} from '@statechannels/client-api-schema';

import {MessageServiceInterface} from './message-service/types';
import {getMessages} from './message-service/utils';
import {WalletObjective} from './models/objective';
import {Engine} from './wallet';

export const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export type RetryOptions = {
  /**
   * The number of attempts to make.
   */
  numberOfAttempts: number;
  /**
   * The initial delay to use in milliseconds
   */
  initialDelay: number;

  /**
   * The multiple that the delay is multiplied by each time
   */
  multiple: number;
};

const DEFAULTS: RetryOptions = {numberOfAttempts: 10, multiple: 2, initialDelay: 50};
export class ChannelManager {
  /**
   * Constructs a channel manager that will ensure objectives get accomplished by resending messages if needed.
   * @param engine The engine to use.
   * @param messageService  The message service to use.
   * @param retryOptions How often and for how long the channel manager should retry objectives.
   * @returns A channel manager.
   */
  public static async create(
    engine: Engine,
    messageService: MessageServiceInterface,
    retryOptions: Partial<RetryOptions> = DEFAULTS
  ): Promise<ChannelManager> {
    return new ChannelManager(engine, messageService, {...DEFAULTS, ...retryOptions});
  }
  private constructor(
    private _engine: Engine,
    private _messageService: MessageServiceInterface,
    private _retryOptions: RetryOptions
  ) {}

  /**
   * TODO: This is a basic implementation of createChannels.
   * This will be cleaned up in https://github.com/statechannels/statechannels/issues/3365
   * @param args
   * @param numberOfChannels
   * @returns
   */
  public async createChannels(args: CreateChannelParams, numberOfChannels: number): Promise<void> {
    const createResult = await this._engine.createChannels(args, numberOfChannels);

    await this.ensureObjectives(createResult.newObjectives, getMessages(createResult.outbox));
  }

  /**
   * Ensures that the provided objectives get completed.
   * Will resend messages as required to ensure that the objectives get completed.
   * @param objectives The list of objectives to ensure get completed.
   * @param objectiveMessages The collection of outgoing messages related to the objective.
   * @returns A promise that resolves when all the objectives are completed
   */
  private async ensureObjectives(
    objectives: WalletObjective[],
    objectiveMessages: Message[]
  ): Promise<void> {
    const remaining = new Map(objectives.map(o => [o.objectiveId, o]));

    const onObjectiveSucceeded = (o: WalletObjective) => {
      if (o.objectiveId === o.objectiveId) {
        remaining.delete(o.objectiveId);
      }

      if (remaining.size === 0) {
        this._engine.removeListener('objectiveSucceeded', onObjectiveSucceeded);
      }
    };

    this._engine.on('objectiveSucceeded', onObjectiveSucceeded);

    // Now that we're listening for objective success we can now send messages
    // that might trigger progress on the objective
    await this._messageService.send(objectiveMessages);

    const {multiple, initialDelay, numberOfAttempts} = this._retryOptions;
    for (let i = 0; i < numberOfAttempts; i++) {
      if (remaining.size === 0) return;

      const delayAmount = initialDelay * Math.pow(multiple, i);
      await delay(delayAmount);

      const {outbox} = await this._engine.syncObjectives(objectives.map(o => o.objectiveId));
      await this._messageService.send(getMessages(outbox));
    }

    this._engine.removeListener('objectiveSucceeded', onObjectiveSucceeded);
    this._engine.logger.error(
      {
        remaining: Array.from(remaining.keys()),
      },
      'Unable to ensure objectives'
    );
    throw new Error('Unable to ensure objectives');
  }

  async destroy(): Promise<void> {
    return this._engine.destroy();
  }
}
