import {Worker} from 'worker_threads';

import {UpdateChannelParams} from '@statechannels/client-api-schema';

import {IncomingServerWalletConfig} from '../../config';
import {MultipleChannelOutput, SingleChannelOutput, WalletEvent} from '../types';
import {SingleThreadedWallet} from '../wallet';

import {WorkerManager} from './manager';

export type WalletEventEmitted<E extends WalletEvent = WalletEvent> = {
  type: 'WalletEventEmitted';
  name: E['type'];
  value: E['value'];
};

function isEventEmitted<E extends WalletEvent>(msg: any): msg is WalletEventEmitted<E> {
  return 'type' in msg && msg.type === 'WalletEventEmitted';
}

/**
 * A multi-threaded Nitro wallet
 */
export class MultiThreadedWallet extends SingleThreadedWallet {
  private workerManager: WorkerManager;

  public static async create(
    walletConfig: IncomingServerWalletConfig
  ): Promise<MultiThreadedWallet> {
    return new this(walletConfig);
  }

  protected constructor(walletConfig: IncomingServerWalletConfig) {
    super(walletConfig);
    this.workerManager = new WorkerManager(this.walletConfig, (worker: Worker) =>
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
