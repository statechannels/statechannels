import {CreateChannelParams} from '@statechannels/client-api-schema';
import {backOff, IBackOffOptions} from 'exponential-backoff';

import {MessageServiceInterface} from './message-service/types';
import {getMessages} from './message-service/utils';
import {WalletObjective} from './models/objective';
import {Wallet} from './wallet';
export const delay = async (ms = 10): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export class ChannelManager {
  /**
   * Constructs a channel manager that will ensure objectives get accomplished by resending messages if needed.
   * @param wallet The wallet to use.
   * @param messageService  The message service to use.
   * @param backOffIntervals At what intervals ensureObjective should retry sending messages to complete an objective.
   * @returns A channel manager.
   */
  public static async create(
    wallet: Wallet,
    messageService: MessageServiceInterface,
    backOffOptions?: Partial<Exclude<IBackOffOptions, 'retry'>>
  ): Promise<ChannelManager> {
    return new ChannelManager(wallet, messageService, backOffOptions ?? {});
  }
  private constructor(
    private _wallet: Wallet,
    private _messageService: MessageServiceInterface,
    private _backOffOptions: Partial<IBackOffOptions>
  ) {}

  /**
   * TODO: This is a basic implementation of createChannels.
   * This will be cleaned up in https://github.com/statechannels/statechannels/issues/3365
   * @param args
   * @param numberOfChannels
   * @returns
   */
  public async createChannels(args: CreateChannelParams, numberOfChannels: number): Promise<void> {
    const createResult = await this._wallet.createChannels(args, numberOfChannels);

    await this._messageService.send(getMessages(createResult));
    await this.ensureObjectives(createResult.newObjectives);
  }

  /**
   * Ensures that the provided objectives get completed.
   * Will resend messages as required to ensure that the objectives get completed.
   * @param objectives The list of objectives to ensure get completed.
   * @returns A promise that resolves when all the objectives are completed
   */
  private async ensureObjectives(objectives: WalletObjective[]): Promise<void> {
    const remaining = new Map(objectives.map(o => [o.objectiveId, o]));

    const onObjectiveSucceeded = (o: WalletObjective) => {
      if (o.objectiveId === o.objectiveId) {
        remaining.delete(o.objectiveId);
      }

      if (remaining.size === 0) {
        this._wallet.removeListener('objectiveSucceeded', onObjectiveSucceeded);
      }
    };

    this._wallet.on('objectiveSucceeded', onObjectiveSucceeded);
    try {
      await backOff(
        async () => {
          const {outbox} = await this._wallet.syncObjectives(objectives.map(o => o.objectiveId));
          await this._messageService.send(getMessages(outbox));

          if (remaining.size !== 0) {
            // Throwing an error indicates to the backoff library that the task is not complete
            throw new Error('Still objectives to complete');
          }
        },

        {...this._backOffOptions, retry: () => remaining.size !== 0}
      );
    } catch (error) {
      this._wallet.removeListener('objectiveSucceeded', onObjectiveSucceeded);
      this._wallet.logger.error('Unable to ensure objectives', {
        remaining: Array.from(remaining.keys()),
      });
      throw new Error('Unable to ensure objectives');
    }
  }

  async destroy(): Promise<void> {
    return this._wallet.destroy();
  }
}
