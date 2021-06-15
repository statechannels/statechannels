import P from 'pino';

import {MultiThreadedEngine} from './multi-threaded-engine';
import {EngineInterface} from './types';
import {IncomingEngineConfigV2, SingleThreadedEngine} from './engine';

/**
 * A single- or multi-threaded Nitro Engine
 *
 * @remarks
 * The number of threads is specified in the supplied {@link @statechannels/server-wallet#RequiredServerEngineConfig | configuration}.
 */
export abstract class Engine extends SingleThreadedEngine implements EngineInterface {
  static async create(
    engineConfig: IncomingEngineConfigV2,
    logger: P.Logger
  ): Promise<SingleThreadedEngine | MultiThreadedEngine> {
    if (engineConfig?.workerThreadAmount && engineConfig.workerThreadAmount > 0) {
      return MultiThreadedEngine.create(engineConfig, logger);
    } else {
      return SingleThreadedEngine.create(engineConfig, logger);
    }
  }
}

export * from '../config';
export * from './types';
export {SingleThreadedEngine, MultiThreadedEngine};
