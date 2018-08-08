import { combineReducers } from 'redux';

import { gameReducer, GameState } from './game';
import { opponentReducer, OpponentState } from './opponents';
import { loginReducer, LoginState } from './login';
import { messagesReducer, MessageState } from './messages';

export interface ApplicationState {
  game: GameState,
  opponent: OpponentState,
  login: LoginState,
  messages: MessageState,
};

export default combineReducers<ApplicationState>({
  game: gameReducer,
  opponent: opponentReducer,
  login: loginReducer,
  messages: messagesReducer,
});
