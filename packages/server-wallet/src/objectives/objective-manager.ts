import {Logger} from 'pino';
import {unreachable} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

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
import {DBObjective, ObjectiveModel} from '../models/objective';

import {ObjectiveManagerParams} from './types';
import {CloseChannelObjective} from './close-channel';

// Nothing.ToWaitFor is a special type
// returned from a cranker when the objective completes
// it is the default value of waiting_for column
// on the objectives table in the db
export enum Nothing {
  ToWaitFor = '',
}

export type WaitingFor =
  | ChannelOpenerWaitingFor
  | ChannelCloserWaitingFor
  | ChallengeSubmitterWaitingFor
  | DefundChannelWaitingFor
  | Nothing;

export interface Cranker<O extends DBObjective> {
  crank: (objective: O, response: WalletResponse, tx: Transaction) => Promise<WaitingFor | Nothing>;
}
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
      let waitingFor: WaitingFor | null;
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
          // NOTE FOR DEVS Implementing a new Objective cranker
          // 1. Define a WaitingFor enum which contains the "early return" or "pause" points of the objective.
          //    These pause points will be used to track progress over time, and for debugging.
          // 2. Import and add it to the WaitingFor union type in this file.
          // 2. Implement the Cranker<YourDBObjectiveHere> interface
          // 3. Make as much progress as you can towards the objective (sign states, submit transactions)
          //    until progress is blocked on an external event (e.g. counterparty State
          //    or blockchain event). Then return early with the waitingFor string
          // 4. Wire up your cranker by inserting a new case to this switch block
          unreachable(objective);
      }
      if (objective.waitingFor != waitingFor) {
        // important to only update in the case of a change
        await ObjectiveModel.updateWaitingFor(objectiveId, waitingFor, tx);
      }
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
