import { combineReducers } from 'redux';

import { loginReducer, LoginState } from './login/reducer';
import { MetamaskState, metamaskReducer } from './metamask/reducer';
import { OpenGameState } from './open-games/state';
import { openGamesReducer } from './open-games/reducer';
import { overlayReducer } from './global/reducer';
import { OverlayState } from './global/state';
import { GameState } from './game-v2/state';
import { gameReducer } from './game-v2/reducer';

export interface SiteState {
  login: LoginState;
  metamask: MetamaskState;
  openGames: OpenGameState;
  game: GameState;
  overlay: OverlayState;
}

export default combineReducers<SiteState>({
  login: loginReducer,
  metamask: metamaskReducer,
  openGames: openGamesReducer,
  game: gameReducer,
  overlay: overlayReducer,
});
