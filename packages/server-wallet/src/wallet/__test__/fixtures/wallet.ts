import {Wallet} from '../..';
import {MockChainService} from '../../../chain-service';
import {ServerWalletConfig} from '../../../config';

export function createWalletForTests(config: ServerWalletConfig): Wallet {
  return Wallet.create(new MockChainService(), config);
}
