import P from 'pino';
import _ from 'lodash';
import {utils} from 'ethers';

import {extractDBConfigFromWalletConfig, defaultTestWalletConfig} from '..';

import {MultiThreadedEngine} from './multi-threaded-engine';
import {EngineInterface, EngineConfig} from './types';
import {SingleThreadedEngine} from './engine';

/**
 * A single- or multi-threaded Nitro Engine
 *
 * @remarks
 * The number of threads is specified in the supplied {@link @statechannels/server-wallet#RequiredServerEngineConfig | configuration}.
 */
export abstract class Engine extends SingleThreadedEngine implements EngineInterface {
  static async create(
    engineConfig: EngineConfig,
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

export const defaultTestEngineConfig = (partialConfig?: Partial<EngineConfig>): EngineConfig => {
  const defaultEngineConfig: EngineConfig = {
    skipEvmValidation: true,
    metrics: {timingMetrics: false},
    workerThreadAmount: 0,
    // eslint-disable-next-line no-process-env
    chainNetworkID: utils.hexlify(parseInt(process.env.CHAIN_NETWORK_ID ?? '0')),
    dbConfig: extractDBConfigFromWalletConfig(defaultTestWalletConfig()),
  };
  return _.assign({}, defaultEngineConfig, partialConfig);
};
