import { combineReducers } from 'redux';

import { applicationReducer, ApplicationState } from './application/reducer';
import { loginReducer, LoginState } from './login/reducer';
import { MetamaskState, metamaskReducer } from './metamask/reducer';
import { walletReducer, Wallet } from '../wallet/redux/reducers/wallet';

export interface SiteState {
  app: ApplicationState;
  login: LoginState;
  wallet: Wallet;
  metamask: MetamaskState;
}

export default combineReducers<SiteState>({
  app: applicationReducer,
  login: loginReducer,
  wallet: walletReducer,
  metamask: metamaskReducer,
});