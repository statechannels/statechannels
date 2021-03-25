import {DefundChannel} from '@statechannels/wallet-core';
import {Transaction} from 'objection';
import {Logger} from 'pino';

import {ChainServiceInterface} from '../chain-service';
import {WalletObjective} from '../models/objective';
import {Cranker, Nothing} from '../objectives/objective-manager';
import {Store} from '../engine/store';
import {EngineResponse} from '../engine/engine-response';

import {Defunder} from './defunder';

export const enum WaitingFor {
  transactionSubmission = 'ChannelDefunder.transactionSubmission',
}

export class ChannelDefunder implements Cranker<WalletObjective<DefundChannel>> {
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
    objective: WalletObjective<DefundChannel>,
    response: EngineResponse,
    tx: Transaction
  ): Promise<WaitingFor | Nothing> {
    const {targetChannelId: channelId} = objective.data;
    const channel = await this.store.getAndLockChannel(channelId, tx);
    if (!channel) {
      throw new Error('Channel must exist');
    }

    await channel.$fetchGraph('funding', {transaction: tx});
    await channel.$fetchGraph('chainServiceRequests', {transaction: tx});

    // This if-statement should be removed and test cases should be added.
    // Defund channel now (in theory) supports Ledger funded channels.
    if (channel.fundingStrategy !== 'Direct') {
      // TODO: https://github.com/statechannels/statechannels/issues/3124
      this.logger.error(
        `Only direct funding is currently supported, but channel ${channel.channelId} has the ${channel.fundingStrategy} strategy`
      );
      await this.store.markObjectiveStatus(objective, 'failed', tx);
      return Nothing.ToWaitFor;
    }

    const {didSubmitTransaction} = await Defunder.create(
      this.store,
      this.chainService,
      this.logger,
      this.timingMetrics
    ).crank(channel, objective, tx);

    // A better methodology is likely to create a Challenge objective that succeeds after a
    // channel has been defunded (instead of succeeding an objective on transaction submission)
    if (didSubmitTransaction) {
      await this.store.markObjectiveStatus(objective, 'succeeded', tx);
      response.queueSucceededObjective(objective);
      return Nothing.ToWaitFor;
    } else return WaitingFor.transactionSubmission;
  }
}
