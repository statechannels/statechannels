import {CreateChannelParams} from '@statechannels/client-api-schema';

import {MessageServiceInterface} from './message-service/types';
import {WalletObjective} from './models/objective';
import {Wallet} from './wallet';
import {getMessages} from './__test-with-peers__/utils';

export const delay = async (ms = 10): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * These are the default backoff intervals used.
 * It uses a simple exponential strategy.
 */
export const DEFAULT_BACKOFF_INTERVALS = [1_000, 2_000, 4_000, 8_000, 16_000];

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
    backOffIntervals = DEFAULT_BACKOFF_INTERVALS
  ): Promise<ChannelManager> {
    return new ChannelManager(wallet, messageService, backOffIntervals);
  }
  private constructor(
    private _wallet: Wallet,
    private _messageService: MessageServiceInterface,
    private _backoffIntervals: number[]
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
    await this.ensureObjectives(createResult.newObjectives, this._wallet, this._messageService);
  }

  /**
   * Ensures that the provided objectives get completed.
   * Will resend messages as required to ensure that the objectives get completed.
   * @param objectives The list of objectives to ensure get completed.
   * @param wallet The wallet to use
   * @param messageService The message service to use.
   * @returns A promise that resolves when all the objectives are completed
   */
  private async ensureObjectives(
    objectives: WalletObjective[],
    wallet: Wallet,
    messageService: MessageServiceInterface
  ): Promise<void> {
    const remaining = new Map(objectives.map(o => [o.objectiveId, o]));

    const onObjectiveSucceeded = (o: WalletObjective) => {
      if (o.objectiveId === o.objectiveId) {
        remaining.delete(o.objectiveId);
      }

      if (remaining.size === 0) {
        wallet.removeListener('objectiveSucceeded', onObjectiveSucceeded);
      }
    };

    wallet.on('objectiveSucceeded', onObjectiveSucceeded);

    for (const retryTimeoutMs of this._backoffIntervals) {
      if (remaining.size === 0) return;

      await delay(retryTimeoutMs);

      const {outbox} = await wallet.syncObjectives(objectives.map(o => o.objectiveId));

      await messageService.send(getMessages(outbox));
    }

    wallet.removeListener('objectiveSucceeded', onObjectiveSucceeded);
    wallet.logger.error('Unable to ensure objectives', {remaining: Array.from(remaining.keys())});
    throw new Error('Unable to ensure objectives');
  }
}
