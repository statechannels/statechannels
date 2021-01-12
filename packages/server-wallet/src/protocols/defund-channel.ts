import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {ChallengeStatus} from '../models/challenge-status';
import {DBDefundChannelObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';

export class ChannelDefunder {
  constructor(
    private store: Store,
    private chainService: ChainServiceInterface,
    logger: Logger,
    _timingMetrics = false
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
        throw new Error(`No channel found for channel id ${channelId}`);
      }

      if (channel.fundingStrategy !== 'Direct') {
        // TODO: https://github.com/statechannels/statechannels/issues/3124
        throw new Error('Only direct funding is currently supported.');
      }

      const result = await ChallengeStatus.getChallengeStatus(tx, channelId);

      if (result.status === 'Challenge Active') {
        throw new Error('Cannot defund a channel with an active challenge');
        // TODO: We might want to refactor challengeStatus to something that
        // applies to both co-operatively concluding or challenging
      } else if (result.status === 'Challenge Finalized') {
        this.chainService.pushOutcomeAndWithdraw(result.challengeState, channel.myAddress);
      } else {
        // No challenge found so we must need to call concludeAndWithdraw
        if (!channel.hasConclusionProof) {
          throw new Error('The support is not a valid conclusion proof.');
        }
        this.chainService.concludeAndWithdraw(channel.support);
      }

      await this.store.markObjectiveAsSucceeded(objective, tx);
    });
  }
}
