import {UpdateChannelParams} from '@statechannels/client-api-schema';
import P from 'pino';

import {EngineConfig, MultipleChannelOutput, SingleChannelOutput} from '../types';
import {SingleThreadedEngine} from '../engine';

import {WorkerManager} from './manager';

/**
 * A multi-threaded Nitro engine
 */
export class MultiThreadedEngine extends SingleThreadedEngine {
  private workerManager: WorkerManager;

  public static async create(
    engineConfig: EngineConfig,
    logger: P.Logger
  ): Promise<MultiThreadedEngine> {
    return new this(engineConfig, logger);
  }

  protected constructor(private engineConfig: EngineConfig, logger: P.Logger) {
    super(engineConfig, logger);
    this.workerManager = new WorkerManager(this.engineConfig, this.logger);
  }

  async updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput> {
    return this.workerManager.updateChannel(args);
  }

  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    return this.workerManager.pushMessage(rawPayload);
  }

  async pushUpdate(rawPayload: unknown): Promise<SingleChannelOutput> {
    return this.workerManager.pushUpdate(rawPayload);
  }

  public async destroy(): Promise<void> {
    await this.workerManager.destroy();
    await super.destroy();
  }

  public async warmUpThreads(): Promise<void> {
    return this.workerManager.warmUpThreads();
  }
}
