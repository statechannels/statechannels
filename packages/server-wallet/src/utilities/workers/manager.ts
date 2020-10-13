import {Worker} from 'worker_threads';
import path from 'path';

import {Pool} from 'tarn';
import {UpdateChannelParams} from '@statechannels/client-api-schema';
import {Either} from 'fp-ts/lib/Either';
import {isLeft} from 'fp-ts/lib/These';
import _ from 'lodash';

import {MultipleChannelMessage, SingleChannelMessage} from '../../wallet';
import {ServerWalletConfig} from '../../config';
import {logger as parentLogger} from '../../logger';

import {StateChannelWorkerData} from './worker-data';
const ONE_DAY = 86400000;

const logger = parentLogger.child({module: 'Worker-Manager'});

export class WorkerManager {
  private pool?: Pool<Worker>;
  private threadAmount: number;
  constructor(walletConfig: ServerWalletConfig) {
    this.threadAmount = walletConfig.workerThreadAmount;
    if (this.threadAmount > 0) {
      this.pool = new Pool({
        create: (): Worker => {
          logger.trace('Starting worker');

          const worker = new Worker(path.resolve(__dirname, './loader.js'), {
            workerData: walletConfig,
          });

          worker.stdout.on('data', data => logger.info(data.toString()));
          worker.stderr.on('data', data => logger.error(data.toString()));
          worker.on('error', err => {
            throw err;
          });
          logger.trace('Started worker %o', worker.threadId);
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
    logger.trace('Warming up threads');
    const acquire = _.range(this.threadAmount).map(() => this.pool?.acquire().promise);
    const workers = await Promise.all(acquire);
    workers.forEach(w => {
      if (w) this.pool?.release(w);
      else throw Error('No worker acquired');
    });
  }
  public async pushMessage(args: unknown): Promise<MultipleChannelMessage> {
    logger.trace('PushMessage called');
    if (!this.pool) throw new Error(`Worker threads are disabled`);
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'PushMessage', args};
    const resultPromise = new Promise<MultipleChannelMessage>((resolve, reject) =>
      worker.once('message', (response: Either<Error, MultipleChannelMessage>) => {
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

  public async updateChannel(args: UpdateChannelParams): Promise<SingleChannelMessage> {
    logger.trace('UpdateChannel called');
    if (!this.pool) throw new Error(`Worker threads are disabled`);
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'UpdateChannel', args};
    const resultPromise = new Promise<SingleChannelMessage>((resolve, reject) =>
      worker.once('message', (response: Either<Error, SingleChannelMessage>) => {
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
