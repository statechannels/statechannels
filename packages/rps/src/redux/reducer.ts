import {combineReducers} from 'redux';

import {loginReducer, LoginState} from './login/reducer';
import {MetamaskState, metamaskReducer} from './metamask/reducer';
import {gameReducer, JointState} from './game/reducer';
import {OpenGameState} from './open-games/state';
import {openGamesReducer} from './open-games/reducer';
import {overlayReducer} from './global/reducer';
import {OverlayState} from './global/state';

export interface SiteState {
  login: LoginState;
  metamask: MetamaskState;
  openGames: OpenGameState;
  game: JointState;
  overlay: OverlayState;
}

export default combineReducers<SiteState>({
  login: loginReducer,
  metamask: metamaskReducer,
  openGames: openGamesReducer,
  game: gameReducer,
  overlay: overlayReducer
});
