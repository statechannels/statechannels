import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {DBDefundChannelObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';

import {Defunder} from './defunder';

export class ChannelDefunder {
  constructor(
    private store: Store,
    private chainService: ChainServiceInterface,
    private logger: Logger,
    private timingMetrics = false
  ) {}
  public static create(
    store: Store,
    chainService: ChainServiceInterface,
    logger: Logger,
    timingMetrics = false
  ): ChannelDefunder {
    return new ChannelDefunder(store, chainService, logger, timingMetrics);
  }

  public async crank(objective: DBDefundChannelObjective, response: WalletResponse): Promise<void> {
    const {targetChannelId: channelId} = objective.data;
    await this.store.lockApp(channelId, async (tx, channel) => {
      if (!channel) {
        this.logger.error(`No channel found for channel id ${channelId}`);
        await this.store.markObjectiveStatus(objective, 'failed', tx);
        return;
      }

      await channel.$fetchGraph('funding', {transaction: tx});
      await channel.$fetchGraph('chainServiceRequests', {transaction: tx});

      if (channel.fundingStrategy !== 'Direct') {
        // TODO: https://github.com/statechannels/statechannels/issues/3124
        this.logger.error(`Only direct funding is currently supported.`);
        await this.store.markObjectiveStatus(objective, 'failed', tx);
        return;
      }

      const {didSubmitTransaction} = await Defunder.create(
        this.store,
        this.chainService,
        this.logger,
        this.timingMetrics
      ).isChannelDefunded(channel, tx);

      // Note that that the objective succeeds regardless of whether the channel is defunded.
      // This objetive will likey get replaced by a ChallengeObjective
      if (didSubmitTransaction) {
        await this.store.markObjectiveStatus(objective, 'succeeded', tx);
        response.queueSucceededObjective(objective);
      }
    });
  }
}
