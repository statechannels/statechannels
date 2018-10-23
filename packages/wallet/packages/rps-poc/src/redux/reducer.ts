import { combineReducers } from 'redux';

import { loginReducer, LoginState } from './login/reducer';
import { MetamaskState, metamaskReducer } from './metamask/reducer';
import { walletReducer, Wallet as WalletState } from '../wallet/redux/reducers/wallet';
import { gameReducer, JointState } from './game/reducer';
import { OpenGameState } from './open-games/state';
import { openGamesReducer } from './open-games/reducer';

export interface SiteState {
  login: LoginState;
  wallet: WalletState;
  metamask: MetamaskState;
  openGames: OpenGameState;
  game: JointState;
}

export default combineReducers<SiteState>({
  login: loginReducer,
  wallet: walletReducer,
  metamask: metamaskReducer,
  openGames: openGamesReducer,
  game: gameReducer,
});
