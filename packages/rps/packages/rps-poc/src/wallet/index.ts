import * as actions from './redux/actions/external';
import WalletController from './containers/WalletContainer';

export interface Wallet {
  privateKey: string;
  address: string;
  sign(stateString: string): string;
}

export { actions, WalletController };

export { walletSaga } from './redux/sagas/wallet';
