import {UpdateChannelParams} from '@statechannels/client-api-schema';

import {IncomingEngineConfig} from '../../config';
import {MultipleChannelOutput, SingleChannelOutput} from '../types';
import {SingleThreadedEngine} from '../engine';

import {WorkerManager} from './manager';

/**
 * A multi-threaded Nitro engine
 */
export class MultiThreadedEngine extends SingleThreadedEngine {
  private workerManager: WorkerManager;

  public static async create(engineConfig: IncomingEngineConfig): Promise<MultiThreadedEngine> {
    return new this(engineConfig);
  }

  protected constructor(engineConfig: IncomingEngineConfig) {
    super(engineConfig);
    this.workerManager = new WorkerManager(this.engineConfig);
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
