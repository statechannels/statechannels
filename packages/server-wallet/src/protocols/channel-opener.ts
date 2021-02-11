import {Logger} from 'pino';
import {unreachable} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {DBOpenChannelObjective, ObjectiveModel} from '../models/objective';
import {WalletResponse} from '../wallet/wallet-response';
import {ChainServiceInterface} from '../chain-service';
import {Channel} from '../models/channel';

import {DirectFunder} from './direct-funder';
import {LedgerFunder} from './ledger-funder';

export class ChannelOpener {
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
  ): ChannelOpener {
    return new ChannelOpener(store, chainService, logger, timingMetrics);
  }

  public async crank(objective: DBOpenChannelObjective, response: WalletResponse): Promise<void> {
    const channelToLock = objective.data.targetChannelId;

    await this.store.transaction(async tx => {
      const channel = await this.store.getAndLockChannel(channelToLock, tx);

      if (!channel) {
        throw new Error(`ChannelOpener can't find channel with id ${channelToLock}`);
      }
      // always queue the channel if we've potentially touched it
      response.queueChannel(channel);

      // if we haven't signed the pre-fund, sign it
      if (!channel.prefundSigned) {
        await this.signPrefundSetup(channel, response, tx);
      }

      // We might be waitingFor theirPreFundState
      let waitingFor = 'theirPreFundState';

      // if we don't have a complete preFundSetup, we are still waitingFor theirPreFundState and cannot progress
      if (!channel.preFundComplete) {
        await updateWaitingFor();
        return;
      }

      // otherwise, we might be waiting on funding
      waitingFor = 'funding';

      // if we have a full pre fund setup, delegate to the funding process to (a) see if
      // the channel is funded, and (b) take action if not
      const funded = await this.crankChannelFunder(objective, channel, response, tx);

      // if the channel is not funded, we are still waitingFor funding and cannot progress
      if (!funded) {
        await updateWaitingFor();
        return;
      }

      // otherwise, we might be waitingFor theirPostFundState
      waitingFor = 'theirPostFundState';

      // if the channel is funded and I haven't signed the post-fund, sign it
      if (funded && !channel.postfundSigned) {
        await this.signPostfundSetup(channel, response, tx);
      }

      // If we are still waitingFor theirPostFundState, we cannot complete
      if (!channel.postFundComplete) {
        await updateWaitingFor();
        return;
      }

      objective = await this.store.markObjectiveStatus(objective, 'succeeded', tx);
      response.queueSucceededObjective(objective);
      waitingFor = '';
      await updateWaitingFor();
      return;

      async function updateWaitingFor() {
        if (objective.waitingFor !== waitingFor) {
          console.log('updating waiting for to ', waitingFor);
          await ObjectiveModel.updateWaitingFor(objective.objectiveId, waitingFor, tx);
        }
      }
    });
  }

  private async crankChannelFunder(
    objective: DBOpenChannelObjective,
    channel: Channel,
    response: WalletResponse,
    tx: Transaction
  ): Promise<boolean> {
    const strategy = objective.data.fundingStrategy;
    switch (strategy) {
      case 'Direct':
        return this.directFunder.crank(objective, channel, response, tx);
      case 'Fake':
        return true;
      case 'Ledger':
        return this.ledgerFunder.crank(objective, channel, response, tx);
      case 'Virtual':
        return false;
      case 'Unknown':
        return false;
      default:
        unreachable(strategy);
    }
  }

  private get directFunder(): DirectFunder {
    return DirectFunder.create(this.store, this.chainService, this.logger, this.timingMetrics);
  }

  private get ledgerFunder(): LedgerFunder {
    return LedgerFunder.create(this.store, this.chainService, this.logger, this.timingMetrics);
  }

  private async signPrefundSetup(
    channel: Channel,
    response: WalletResponse,
    tx: Transaction
  ): Promise<void> {
    // TODO: should probably have more checking around the form of channel.latest
    const prefund = {...channel.latest, turnNum: 0};
    const signedState = await this.store.signState(channel, prefund, tx);
    response.queueState(signedState, channel.myIndex, channel.channelId);
    response.queueChannel(channel);
  }

  private async signPostfundSetup(
    channel: Channel,
    response: WalletResponse,
    tx: Transaction
  ): Promise<void> {
    // TODO: should probably have more checking around the form of channel.latest
    const postfund = {...channel.latest, turnNum: channel.nParticipants * 2 - 1};
    const signedState = await this.store.signState(channel, postfund, tx);
    response.queueState(signedState, channel.myIndex, channel.channelId);
    response.queueChannel(channel);
  }
}
