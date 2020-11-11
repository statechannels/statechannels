export {WalletEvent, SingleChannelOutput, MultipleChannelOutput} from './wallet';

import {IncomingServerWalletConfig} from '../config';
import {ChainServiceInterface} from '../chain-service';

import {MultiThreadedWallet} from './multi-threaded-wallet';
import {SingleThreadedWallet} from './wallet';

export type Wallet = SingleThreadedWallet | MultiThreadedWallet;

export const Wallet = {
  create(chainService: ChainServiceInterface, walletConfig: IncomingServerWalletConfig): Wallet {
    if (walletConfig?.workerThreadAmount && walletConfig.workerThreadAmount > 0) {
      return MultiThreadedWallet.create(chainService, walletConfig);
    } else {
      return SingleThreadedWallet.create(chainService, walletConfig);
    }
  },
};

export * from '../config';
