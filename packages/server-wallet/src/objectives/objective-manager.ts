import {Logger} from 'pino';
import {unreachable} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';
import {ChannelOpener} from '../protocols/open-channel';
import {ChannelCloser} from '../protocols/close-channel';
import {Store} from '../wallet/store';
import {ChainServiceInterface} from '../chain-service';
import {WalletResponse} from '../wallet/response-builder';

import {ObjectiveManagerParams} from './types';
import {CloseChannelObjective} from './close-channel';

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
    const objective = await this.store.getObjective(objectiveId);

    switch (objective.type) {
      case 'OpenChannel':
        return this.channelOpener.crank(objective, response);
      case 'CloseChannel':
        return this.channelCloser.crank(objective, response);
      default:
        unreachable(objective);
    }
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
