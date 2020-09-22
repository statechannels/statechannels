import {Worker} from 'worker_threads';
import path from 'path';

import {Pool} from 'tarn';
import {State, StateWithHash} from '@statechannels/wallet-core';
import {UpdateChannelParams} from '@statechannels/client-api-schema';
import {Either} from 'fp-ts/lib/Either';
import {isLeft} from 'fp-ts/lib/These';

import {MultipleChannelResult, SingleChannelResult} from '../../wallet';
import {ServerWalletConfig} from '../../config';

import {StateChannelWorkerData} from './worker-data';
const ONE_DAY = 86400000;
export class WorkerManager {
  private pool: Pool<Worker>;

  constructor(walletConfig: ServerWalletConfig) {
    this.pool = new Pool({
      create: (): Worker =>
        new Worker(path.resolve(__dirname, './loader.js'), {workerData: walletConfig}),
      destroy: (worker: Worker): Promise<number> => worker.terminate(),
      min: walletConfig.workerThreadAmount,
      max: walletConfig.workerThreadAmount,
      reapIntervalMillis: ONE_DAY,
      idleTimeoutMillis: ONE_DAY,
    });
  }
  public async concurrentSignState(
    state: StateWithHash,
    privateKey: string
  ): Promise<{state: State; signature: string}> {
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'SignState', state, privateKey};
    const resultPromise = new Promise<{state: State; signature: string}>((resolve, reject) =>
      worker.once('message', (response: Either<Error, {state: State; signature: string}>) => {
        this.pool.release(worker);
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

  public async pushMessage(args: unknown): Promise<MultipleChannelResult> {
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'PushMessage', args};
    const resultPromise = new Promise<any>((resolve, reject) =>
      worker.once('message', (response: Either<Error, MultipleChannelResult>) => {
        this.pool.release(worker);
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
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'UpdateChannel', args};
    const resultPromise = new Promise<any>((resolve, reject) =>
      worker.once('message', (response: Either<Error, SingleChannelResult>) => {
        this.pool.release(worker);
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

  public async destroy(): Promise<void> {
    await this.pool.destroy();
  }
}
