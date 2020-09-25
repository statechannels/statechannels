import {Worker} from 'worker_threads';
import path from 'path';

import {Pool} from 'tarn';
import {UpdateChannelParams} from '@statechannels/client-api-schema';
import {Either} from 'fp-ts/lib/Either';
import {isLeft} from 'fp-ts/lib/These';
import _ from 'lodash';

import {MultipleChannelResult, SingleChannelResult} from '../../wallet';
import {ServerWalletConfig} from '../../config';
import {logger} from '../../logger';

import {StateChannelWorkerData} from './worker-data';
const ONE_DAY = 86400000;
export class WorkerManager {
  private pool?: Pool<Worker>;
  private threadAmount: number;
  constructor(walletConfig: ServerWalletConfig) {
    this.threadAmount = walletConfig.workerThreadAmount;
    if (this.threadAmount > 0) {
      this.pool = new Pool({
        create: (): Worker => {
          const worker = new Worker(path.resolve(__dirname, './loader.js'), {
            workerData: walletConfig,
          });

          worker.stdout.on('data', data => logger.info(data.toString()));
          worker.stderr.on('data', data => logger.error(data.toString()));
          worker.on('error', err => {
            throw err;
          });
          return worker;
        },
        destroy: (worker: Worker): Promise<number> => worker.terminate(),
        min: this.threadAmount,
        max: this.threadAmount,
        reapIntervalMillis: ONE_DAY,
        idleTimeoutMillis: ONE_DAY,
      });
    }
  }
  public async warmUpThreads(): Promise<void> {
    const acquire = _.range(this.threadAmount).map(() => this.pool?.acquire().promise);
    const workers = await Promise.all(acquire);
    workers.forEach(w => {
      if (w) this.pool?.release(w);
      else throw Error('No worker acquired');
    });
  }
  public async pushMessage(args: unknown): Promise<MultipleChannelResult> {
    if (!this.pool) throw new Error(`Worker threads are disabled`);
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'PushMessage', args};
    const resultPromise = new Promise<any>((resolve, reject) =>
      worker.once('message', (response: Either<Error, MultipleChannelResult>) => {
        this.pool?.release(worker);
        if (isLeft(response)) {
          reject(response.left);
        } else {
          resolve(response.right);
        }
      })
    );

    worker.postMessage(data);
    return resultPromise;
  }

  public async updateChannel(args: UpdateChannelParams): Promise<SingleChannelResult> {
    if (!this.pool) throw new Error(`Worker threads are disabled`);
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'UpdateChannel', args};
    const resultPromise = new Promise<any>((resolve, reject) =>
      worker.once('message', (response: Either<Error, SingleChannelResult>) => {
        this.pool?.release(worker);
        if (isLeft(response)) {
          logger.error(response);
          reject(response.left);
        } else {
          resolve(response.right);
        }
      })
    );

    worker.postMessage(data);
    return resultPromise;
  }

  public async destroy(): Promise<void> {
    await this.pool?.destroy();
  }
}
