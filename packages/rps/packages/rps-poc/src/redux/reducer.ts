import { combineReducers } from 'redux';

import { loginReducer, LoginState } from './login/reducer';
import { MetamaskState, metamaskReducer } from './metamask/reducer';
import { walletReducer, WalletState } from '../wallet';
import { gameReducer, JointState } from './game/reducer';
import { OpenGameState } from './open-games/state';
import { openGamesReducer } from './open-games/reducer';
import { rulesReducer } from './global/reducer';
import { RulesState } from './global/state';

export interface SiteState {
  login: LoginState;
  wallet: WalletState;
  metamask: MetamaskState;
  openGames: OpenGameState;
  game: JointState;
  rules: RulesState;
}

export default combineReducers<SiteState>({
  login: loginReducer,
  wallet: walletReducer,
  metamask: metamaskReducer,
  openGames: openGamesReducer,
  game: gameReducer,
  rules: rulesReducer,
});
