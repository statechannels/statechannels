import {Logger} from 'pino';
import {unreachable} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';
import {ChannelOpener, WaitingFor as ChannelOpenerWaitingFor} from '../protocols/channel-opener';
import {ChannelCloser, WaitingFor as ChannelCloserWaitingFor} from '../protocols/channel-closer';
import {Store} from '../wallet/store';
import {ChainServiceInterface} from '../chain-service';
import {WalletResponse} from '../wallet/wallet-response';
import {
  ChallengeSubmitter,
  WaitingFor as ChallengeSubmitterWaitingFor,
} from '../protocols/challenge-submitter';
import {ChannelDefunder, WaitingFor as DefundChannelWaitingFor} from '../protocols/defund-channel';
import {ObjectiveModel} from '../models/objective';

import {ObjectiveManagerParams} from './types';
import {CloseChannelObjective} from './close-channel';

export type WaitingFor =
  | ChannelOpenerWaitingFor
  | ChannelCloserWaitingFor
  | ChallengeSubmitterWaitingFor
  | DefundChannelWaitingFor;
export class ObjectiveManager {
  private store: Store;
  private logger: Logger;
  private chainService: ChainServiceInterface;
  private timingMetrics: boolean;

  static create(params: ObjectiveManagerParams): ObjectiveManager {
    return new this(params);
  }

  private constructor({store, logger, chainService, timingMetrics}: ObjectiveManagerParams) {
    this.store = store;
    this.logger = logger;
    this.chainService = chainService;
    this.timingMetrics = timingMetrics;
  }

  /**
   * Attempts to advance the given objective
   *
   * Swallows (and logs) any errors
   *
   * @param objectiveId - id of objective to try to advance
   * @param response - response builder; will be modified by the method
   */
  async crank(objectiveId: string, response: WalletResponse): Promise<void> {
    return this.store.transaction(async tx => {
      const objective = await this.store.getObjective(objectiveId, tx);
      let waitingFor: WaitingFor;
      switch (objective.type) {
        case 'OpenChannel':
          waitingFor = await this.channelOpener.crank(objective, response, tx);
          break;
        case 'CloseChannel':
          waitingFor = await this.channelCloser.crank(objective, response, tx);
          break;
        case 'SubmitChallenge':
          waitingFor = await this.challengeSubmitter.crank(objective, response, tx);
          break;
        case 'DefundChannel':
          waitingFor = await this.channelDefunder.crank(objective, response, tx);
          break;
        default:
          unreachable(objective);
      }
      await ObjectiveModel.updateWaitingFor(objectiveId, waitingFor, tx);
    });
  }

  private get channelDefunder(): ChannelDefunder {
    return ChannelDefunder.create(this.store, this.chainService, this.logger, this.timingMetrics);
  }

  private get challengeSubmitter(): ChallengeSubmitter {
    return ChallengeSubmitter.create(
      this.store,
      this.chainService,
      this.logger,
      this.timingMetrics
    );
  }
  private get channelOpener(): ChannelOpener {
    return ChannelOpener.create(this.store, this.chainService, this.logger, this.timingMetrics);
  }

  private get channelCloser(): ChannelCloser {
    return ChannelCloser.create(this.store, this.chainService, this.logger, this.timingMetrics);
  }

  public async commenceCloseChannel(channelId: Bytes32, response: WalletResponse): Promise<void> {
    return CloseChannelObjective.commence(channelId, response, this.store);
  }
}
