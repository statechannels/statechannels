import {Worker} from 'worker_threads';
import path from 'path';

import {Pool} from 'tarn';
import {UpdateChannelParams} from '@statechannels/client-api-schema';
import {Either} from 'fp-ts/lib/Either';
import {isLeft, isRight} from 'fp-ts/lib/These';
import _ from 'lodash';
import {Logger} from 'pino';

import {ServerWalletConfig} from '../../config';
import {createLogger} from '../../logger';
import {MultipleChannelOutput, SingleChannelOutput} from '../types';

import {StateChannelWorkerData} from './worker-data';

const ONE_DAY = 86400000;

export class WorkerManager {
  private pool?: Pool<Worker>;
  private threadAmount: number;
  private logger: Logger;

  /**
   *
   * @param walletConfig server wallet config to be passed to the worker wallet
   * @param onNewWorker callback that is executed when a new worker is created
   */
  constructor(walletConfig: ServerWalletConfig, onNewWorker: (worker: Worker) => void) {
    this.logger = createLogger(walletConfig).child({module: 'Worker-Manager'});
    this.threadAmount = walletConfig.workerThreadAmount;
    if (this.threadAmount === 0) {
      throw new Error('Invalid walletConfig: threadAmount should not be 0');
    }

    this.pool = new Pool({
      create: (): Worker => {
        this.logger.trace('Starting worker');

        const worker = new Worker(path.resolve(__dirname, './loader.js'), {
          workerData: walletConfig,
        });

        worker.on('error', err => {
          throw err;
        });
        onNewWorker(worker);
        this.logger.trace('Started worker %o', worker.threadId);
        return worker;
      },
      destroy: (worker: Worker): Promise<number> => worker.terminate(),
      min: this.threadAmount,
      max: this.threadAmount,
      reapIntervalMillis: ONE_DAY,
      idleTimeoutMillis: ONE_DAY,
    });
  }

  public async warmUpThreads(): Promise<void> {
    this.logger.trace('Warming up threads');
    const acquire = _.range(this.threadAmount).map(() => this.pool?.acquire().promise);
    const workers = await Promise.all(acquire);
    workers.forEach(w => {
      if (w) this.pool?.release(w);
      else throw Error('No worker acquired');
    });
  }

  /**
   *
   * @param {operation, args}: operation & arguments to send to worker
   * @returns a promise that
   *   - resolves when the worker thread sends a "right" message, containing a result
   *   - rejects rejects worker thread sends a "left" message, containing an error
   *
   * Sends {operation, args} to a worker thread.
   */
  private async sendOperation<
    T extends SingleChannelOutput | MultipleChannelOutput,
    O extends StateChannelWorkerData
  >({operation, args}: O): Promise<T> {
    this.logger.trace('%s called', operation);

    if (!this.pool) throw new Error(`Worker threads are disabled`);

    const worker = await this.pool.acquire().promise;

    const resultPromise = new Promise<T>((resolve, reject) => {
      const handler = (response: Either<Error, T>) => {
        this.pool?.release(worker);

        if (isLeft(response)) {
          reject(response.left);
        } else if (isRight(response)) {
          // WARNING: The correctness of this implementation relies on the fact that a worker
          // only handles one concurrent operation.
          // If a worker handles concurrent operations, then we should wait until we get a reply
          // with the same message id.
          worker.off('message', handler);
          resolve(response.right);
        }
      };
      worker.on('message', handler);
    });

    worker.postMessage({operation, args});

    return resultPromise;
  }

  public async pushMessage(args: unknown): Promise<MultipleChannelOutput> {
    return this.sendOperation({operation: 'PushMessage', args});
  }

  public async pushUpdate(args: unknown): Promise<SingleChannelOutput> {
    return this.sendOperation({operation: 'PushUpdate', args});
  }

  public async updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput> {
    return this.sendOperation({operation: 'UpdateChannel', args});
  }

  public async destroy(): Promise<void> {
    await this.pool?.destroy();
  }
}
