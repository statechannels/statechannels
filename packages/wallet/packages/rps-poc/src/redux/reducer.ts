import { combineReducers } from 'redux';

import { applicationReducer, ApplicationState } from './application/reducer';
import { loginReducer, LoginState } from './login/reducer';
import { WalletState, walletStateReducer } from '../wallet/redux/reducers/wallet-state';
import { autoOpponentReducer } from './auto-opponent/reducer';

export interface SiteState {
  app: ApplicationState;
  login: LoginState;
  wallet: WalletState;
  autoOpponentAddress: string;
};

export default combineReducers<SiteState>({
  app: applicationReducer,
  login: loginReducer,
  wallet: walletStateReducer,
  autoOpponentAddress: autoOpponentReducer,
});
