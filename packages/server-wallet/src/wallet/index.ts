import {IncomingServerWalletConfig} from '../config';

import {MultiThreadedWallet} from './multi-threaded-wallet';
import {WalletInterface} from './types';
import {SingleThreadedWallet} from './wallet';

/**
 * A single- or multi-threaded Nitro wallet
 *
 * @remarks
 * The number of threads is specified in the supplied {@link @statechannels/server-wallet#RequiredServerWalletConfig | configuration}.
 */
export abstract class Wallet extends SingleThreadedWallet implements WalletInterface {
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
export * from './types';
export {SingleThreadedWallet, MultiThreadedWallet};
