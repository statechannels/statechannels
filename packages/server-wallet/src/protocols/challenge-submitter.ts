import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {ChainServiceRequest} from '../models/chain-service-request';
import {DBSubmitChallengeObjective} from '../models/objective';
import {Store} from '../wallet/store';
import {WalletResponse} from '../wallet/wallet-response';

export class ChallengeSubmitter {
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
  ): ChallengeSubmitter {
    return new ChallengeSubmitter(store, chainService, logger, timingMetrics);
  }
  public async crank(
    objective: DBSubmitChallengeObjective,
    response: WalletResponse
  ): Promise<void> {
    const {targetChannelId: channelToLock, challengeState} = objective.data;

    await this.store.transaction(async tx => {
      const channel = await this.store.getLockedChannel(channelToLock, tx);
      if (!channel) {
        this.logger.warn(`No channel exists for channel ${channelToLock}`);
        return false;
      }

      const {status} = channel.challengeStatus.toResult();
      if (status !== 'No Challenge Detected') {
        this.logger.warn('There is already a challange registered on chain');
        return false;
      }

      if (!channel.signingWallet) {
        throw new Error(`No signing wallet fetched for channel ${channelToLock}`);
      }

      await ChainServiceRequest.insertOrUpdate(channelToLock, 'challenge', tx);

      const signedState = await this.store.signState(channel, challengeState, tx);

      await this.chainService.challenge([signedState], channel.signingWallet.privateKey);

      response.queueChannel(channel);
      return true;
    });
  }
}
