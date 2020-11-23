export {
  WalletEvent,
  SingleChannelOutput,
  MultipleChannelOutput,
  ObjectiveSucceededValue,
} from './wallet';

import { ServerWalletConfig } from '../config';

import { MultiThreadedWallet } from './multi-threaded-wallet';
import { SingleThreadedWallet } from './wallet';

export type Wallet = SingleThreadedWallet | MultiThreadedWallet;

export const Wallet = {
  create(walletConfig?: ServerWalletConfig): Wallet {
    if (walletConfig?.workerThreadAmount && walletConfig.workerThreadAmount > 0) {
      return MultiThreadedWallet.create(walletConfig);
    } else {
      return SingleThreadedWallet.create(walletConfig);
    }
  },
};

export { ServerWalletConfig };
