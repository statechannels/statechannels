import { combineReducers } from 'redux';

import { applicationReducer, ApplicationState } from './application/reducer';
import { loginReducer, LoginState } from './login/reducer';
import { WalletState, walletStateReducer } from '../wallet/redux/reducers/wallet-state';
import { MetamaskState, metamaskReducer } from './metamask/reducer';

export interface SiteState {
  app: ApplicationState;
  login: LoginState;
  wallet: WalletState;
  metamask: MetamaskState;
}

export default combineReducers<SiteState>({
  app: applicationReducer,
  login: loginReducer,
  wallet: walletStateReducer,
  metamask: metamaskReducer,
});
