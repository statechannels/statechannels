import {Worker} from 'worker_threads';
import path from 'path';

import {Pool} from 'tarn';
import {State, StateWithHash} from '@statechannels/wallet-core';
import {UpdateChannelParams} from '@statechannels/client-api-schema';

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
      min: 16,
      max: 16,
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
    const resultPromise = new Promise<{state: State; signature: string}>(resolve =>
      worker.once('message', (response: {state: State; signature: string}) => {
        this.pool.release(worker);
        resolve(response);
      })
    );

    worker.postMessage(data);
    return resultPromise;
  }

  public async pushMessage(args: unknown): Promise<MultipleChannelResult> {
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'PushMessage', args};
    const resultPromise = new Promise<any>(resolve =>
      worker.once('message', (response: MultipleChannelResult) => {
        this.pool.release(worker);
        resolve(response);
      })
    );

    worker.postMessage(data);
    return resultPromise;
  }

  public async updateChannel(args: UpdateChannelParams): Promise<SingleChannelResult> {
    const worker = await this.pool.acquire().promise;
    const data: StateChannelWorkerData = {operation: 'UpdateChannel', args};
    const resultPromise = new Promise<any>(resolve =>
      worker.once('message', (response: SingleChannelResult) => {
        this.pool.release(worker);
        resolve(response);
      })
    );

    worker.postMessage(data);
    return resultPromise;
  }

  public async destroy(): Promise<void> {
    await this.pool.destroy();
  }
}
