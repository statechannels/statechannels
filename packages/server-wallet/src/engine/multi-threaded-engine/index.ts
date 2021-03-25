import {Worker} from 'worker_threads';

import {UpdateChannelParams} from '@statechannels/client-api-schema';

import {IncomingEngineConfig} from '../../config';
import {MultipleChannelOutput, SingleChannelOutput, EngineEvent} from '../types';
import {SingleThreadedEngine} from '../engine';

import {WorkerManager} from './manager';

export type EngineEventEmitted<E extends EngineEvent = EngineEvent> = {
  type: 'EngineEventEmitted';
  name: E['type'];
  value: E['value'];
};

function isEventEmitted<E extends EngineEvent>(msg: any): msg is EngineEventEmitted<E> {
  return 'type' in msg && msg.type === 'EngineEventEmitted';
}

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
    this.workerManager = new WorkerManager(this.engineConfig, (worker: Worker) =>
      worker.on('message', (msg: any) => {
        if (isEventEmitted(msg)) this.emit(msg.name, msg.value);
      })
    );
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
