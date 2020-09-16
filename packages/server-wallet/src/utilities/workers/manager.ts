import {Worker} from 'worker_threads';
import path from 'path';

import {Pool} from 'tarn';
import {State, StateWithHash} from '@statechannels/wallet-core';

import {StateChannelWorkerData} from './worker-message';

export class WorkerManager {
  pool = new Pool({
    create: (): Worker => new Worker(path.resolve(__dirname, './loader.js')),
    destroy: (worker: Worker): Promise<number> => worker.terminate(),
    min: 1,
    max: 5,
    reapIntervalMillis: 2147483647,
  });

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

  public async destroy(): Promise<void> {
    await this.pool.destroy();
  }
}
