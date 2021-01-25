import {IncomingServerWalletConfig} from '../config';

export {SingleChannelOutput, MultipleChannelOutput} from './types';
import {MultiThreadedWallet} from './multi-threaded-wallet';
import {SingleThreadedWallet} from './wallet';

export abstract class Wallet extends SingleThreadedWallet {
  static async create(
    walletConfig: IncomingServerWalletConfig
  ): Promise<SingleThreadedWallet | MultiThreadedWallet> {
    if (walletConfig?.workerThreadAmount && walletConfig.workerThreadAmount > 0) {
      return MultiThreadedWallet.create(walletConfig);
    } else {
      return SingleThreadedWallet.create(walletConfig);
    }
  }
}

export * from '../config';
export {SingleThreadedWallet, MultiThreadedWallet};
