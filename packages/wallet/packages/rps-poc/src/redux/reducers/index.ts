import { combineReducers } from 'redux';

import { gameReducer, GameState } from './game';
import { opponentReducer, OpponentState } from './opponents';
import { loginReducer, LoginState } from './login';
import { WalletState, walletStateReducer } from '../../wallet/redux/reducers/wallet-state';

export interface ApplicationState {
  game: GameState;
  opponents: OpponentState;
  login: LoginState;
  wallet: WalletState;
}

export default combineReducers<ApplicationState>({
  game: gameReducer,
  opponents: opponentReducer,
  login: loginReducer,
  wallet: walletStateReducer,
});
