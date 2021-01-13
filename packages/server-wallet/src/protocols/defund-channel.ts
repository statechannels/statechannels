import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {ChainServiceRequest} from '../models/chain-service-request';
import {ChallengeStatus} from '../models/challenge-status';
import {DBDefundChannelObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';

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

  public async crank(
    objective: DBDefundChannelObjective,
    _response: WalletResponse
  ): Promise<void> {
    const {targetChannelId: channelId} = objective.data;
    await this.store.transaction(async tx => {
      const channel = await this.store.getAndLockChannel(channelId, tx);

      if (!channel) {
        this.logger.error(`No channel found for channel id ${channelId}`);
        await this.store.markObjectiveStatus(objective, 'failed', tx);
        return;
      }

      if (channel.fundingStrategy !== 'Direct') {
        // TODO: https://github.com/statechannels/statechannels/issues/3124
        this.logger.error(`Only direct funding is currently supported.`);
        await this.store.markObjectiveStatus(objective, 'failed', tx);
        return;
      }

      const result = await ChallengeStatus.getChallengeStatus(tx, channelId);

      // TODO: We might want to refactor challengeStatus to something that
      // applies to both co-operatively concluding or challenging
      // see https://github.com/statechannels/statechannels/issues/3132
      if (result.status === 'Challenge Finalized') {
        await ChainServiceRequest.insertOrUpdate(channelId, 'pushOutcome', tx);
        this.chainService.pushOutcomeAndWithdraw(result.challengeState, channel.myAddress);
        await this.store.markObjectiveStatus(objective, 'succeeded', tx);

        return;
      } else if (channel.hasConclusionProof) {
        await ChainServiceRequest.insertOrUpdate(channelId, 'withdraw', tx);
        this.chainService.concludeAndWithdraw(channel.support);
        await this.store.markObjectiveStatus(objective, 'succeeded', tx);
        return;
      }
    });
  }
}
