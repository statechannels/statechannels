import {Logger} from 'pino';
import {OpenChannel, unreachable} from '@statechannels/wallet-core';
import _ from 'lodash';
import {Transaction} from 'objection';

import {Store} from '../engine/store';
import {WalletObjective} from '../models/objective';
import {EngineResponse} from '../engine/engine-response';
import {ChainServiceInterface} from '../chain-service';
import {Channel} from '../models/channel';
import {Nothing, Cranker} from '../objectives/objective-manager';

import {DirectFunder} from './direct-funder';
import {LedgerFunder} from './ledger-funder';

export enum WaitingFor {
  theirPreFundSetup = 'ChannelOpener.theirPreFundSetup',
  theirPostFundState = 'ChannelOpener.theirPostFundSetup',
  funding = 'ChannelOpener.funding', // TODO reuse ChannelFunder.waitingFor,
}

export class ChannelOpener implements Cranker<WalletObjective<OpenChannel>> {
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

  public async crank(
    objective: WalletObjective<OpenChannel>,
    response: EngineResponse,
    tx: Transaction
  ): Promise<WaitingFor | Nothing> {
    const channelToLock = objective.data.targetChannelId;

    const channel = await this.store.getAndLockChannel(channelToLock, tx);

    // always queue the channel if we've potentially touched it
    response.queueChannel(channel);

    // if we haven't signed the pre-fund, sign it
    if (!channel.prefundSigned) {
      await this.signPrefundSetup(objective.objectiveId, channel, response, tx);
    }

    // if we don't have a complete preFundSetup, we are still waitingFor theirPreFundState and cannot progress
    if (!channel.preFundComplete) return WaitingFor.theirPreFundSetup;

    // if we have a full pre fund setup, delegate to the funding process to (a) see if
    // the channel is funded, and (b) take action if not
    const funded = await this.crankChannelFunder(objective, channel, response, tx);

    // if the channel is not funded, we are still waitingFor funding and cannot progress
    if (!funded) return WaitingFor.funding;

    // if the channel is funded and I haven't signed the post-fund, sign it
    if (funded && !channel.postfundSigned) {
      await this.signPostfundSetup(objective.objectiveId, channel, response, tx);
    }

    // If we are still waitingFor theirPostFundState, we cannot complete
    if (!channel.postFundComplete) return WaitingFor.theirPostFundState;

    objective = await this.store.markObjectiveStatus(objective, 'succeeded', tx);
    response.queueSucceededObjective(objective);

    return Nothing.ToWaitFor;
  }

  private async crankChannelFunder(
    objective: WalletObjective<OpenChannel>,
    channel: Channel,
    response: EngineResponse,
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
    objectiveId: string,
    channel: Channel,
    response: EngineResponse,
    tx: Transaction
  ): Promise<void> {
    // TODO: should probably have more checking around the form of channel.latest
    const prefund = {...channel.latest, turnNum: 0};
    const signedState = await this.store.signState(channel, prefund, tx);
    response.queueState(signedState, channel.myIndex, channel.channelId, objectiveId);
    response.queueChannel(channel);
  }

  private async signPostfundSetup(
    objectiveId: string,
    channel: Channel,
    response: EngineResponse,
    tx: Transaction
  ): Promise<void> {
    // TODO: should probably have more checking around the form of channel.latest
    const postfund = {...channel.latest, turnNum: channel.nParticipants * 2 - 1};
    const signedState = await this.store.signState(channel, postfund, tx);
    response.queueState(signedState, channel.myIndex, channel.channelId, objectiveId);
    response.queueChannel(channel);
  }
}
