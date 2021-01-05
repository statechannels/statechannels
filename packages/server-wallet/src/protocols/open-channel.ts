import {Logger} from 'pino';
import {unreachable} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {DBOpenChannelObjective} from '../models/objective';
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
      const channel = await this.store.getLockedChannel(channelToLock, tx);

      if (!channel) {
        throw new Error(`ChannelOpener can't find channel with id ${channelToLock}`);
      }

      // if we haven't signed the pre-fund, sign it
      if (!channel.prefundSigned) {
        await this.signPrefundSetup(channel, response, tx);
      }

      // if we don't have a supported preFundSetup, we're done for now
      if (!channel.prefundSupported) {
        return;
      }

      // if we have a full pre fund setup, delegate to the funding process to (a) see if
      // the channel is funded, and (b) take action if not
      const funded = await this.crankChannelFunder(objective, channel, response, tx);

      // if the channel is funded and I haven't signed the post-fund, sign it
      if (funded && !channel.postfundSigned) {
        await this.signPostfundSetup(channel, response, tx);
      }

      if (channel.postfundSupported) {
        await this.store.markObjectiveAsSucceeded(objective, tx);

        response.queueChannel(channel); // why am I doing this?
        response.queueSucceededObjective(objective);
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
    const postfund = {...channel.latest, turnNum: 0};
    const signedState = await this.store.signState(channel, postfund, tx);
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
