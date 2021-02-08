import {SignedState, State, SubmitChallenge} from '@statechannels/wallet-core';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {ChainServiceRequest} from '../models/chain-service-request';
import {Channel} from '../models/channel';
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
  public async crank(objective: SubmitChallenge, response: WalletResponse): Promise<void> {
    const {targetChannelId: channelToLock} = objective.data;

    await this.store.transaction(async tx => {
      const channel = await this.store.getAndLockChannel(channelToLock, tx);
      if (!channel) {
        this.logger.warn(`No channel exists for channel ${channelToLock}`);
        return;
      }

      const status = channel.adjudicatorStatus
        ? channel.adjudicatorStatus.toResult().channelMode
        : 'Open';
      if (status !== 'Open') {
        this.logger.warn('There is an existing challenge or the channel is finalized on chain');
        return;
      }

      if (!channel.signingWallet) {
        throw new Error(`No signing wallet fetched for channel ${channelToLock}`);
      }

      const existingRequest = await ChainServiceRequest.query(tx)
        .where({channelId: channelToLock, request: 'challenge'})
        .first();

      if (existingRequest) {
        this.logger.warn('There is already an existing request', existingRequest);
        return;
      }

      await ChainServiceRequest.insertOrUpdate(channelToLock, 'challenge', tx);

      if (channel.initialSupport.length === 0) {
        this.logger.error(
          {channelId: channel.channelId},
          'There is no initial support stored for the channel'
        );
        await this.store.markObjectiveStatus(objective, 'failed', tx);
        return;
      }

      await this.chainService.challenge(channel.initialSupport, channel.signingWallet.privateKey);

      objective = await this.store.markObjectiveStatus(objective, 'succeeded', tx);
      response.queueChannel(channel);
      response.queueSucceededObjective(objective);
    });
  }

  /**
   * A simple method that only produces a signature for a given state.
   * It does not store the state or validate it in any way.
   */
  private async signState(channel: Channel, state: State, tx: Transaction): Promise<SignedState> {
    const signingWallet =
      channel.signingWallet || (await channel.$relatedQuery('signingWallet', tx).first());

    if (!signingWallet) {
      throw new Error('No signing wallets');
    }
    return {...state, signatures: [signingWallet.signState(state)]};
  }
}
