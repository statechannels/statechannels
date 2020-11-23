import { UpdateChannelParams } from '@statechannels/client-api-schema';

import { ServerWalletConfig } from '../../config';
import { MultipleChannelOutput, SingleChannelOutput, SingleThreadedWallet } from '../wallet';

import { WorkerManager } from './manager';

export class MultiThreadedWallet extends SingleThreadedWallet {
  private workerManager: WorkerManager;

  public static create(walletConfig?: ServerWalletConfig): MultiThreadedWallet {
    return new this(walletConfig);
  }

  protected constructor(walletConfig?: ServerWalletConfig) {
    super(walletConfig);
    this.workerManager = new WorkerManager(this.walletConfig);
  }

  async updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput> {
    return this.workerManager.updateChannel(args);
  }

  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    return this.workerManager.pushMessage(rawPayload);
  }

  public async destroy(): Promise<void> {
    await this.workerManager.destroy();
    await super.destroy();
  }

  public async warmUpThreads(): Promise<void> {
    return this.workerManager.warmUpThreads();
  }
}
