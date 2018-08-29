import { combineReducers } from 'redux';

import { gameReducer, GameState } from './game';
import { opponentReducer, OpponentState } from './opponents';
import { loginReducer, LoginState } from './login';
import { WalletState, walletStateReducer } from '../../wallet/redux/reducers/wallet-state';
import { drizzleReducers } from 'drizzle';

export interface ApplicationState {
  game: GameState;
  opponents: OpponentState;
  login: LoginState;
  wallet: WalletState;
  contracts: any[];
}

export default combineReducers<ApplicationState>({
  game: gameReducer,
  opponents: opponentReducer,
  login: loginReducer,
  wallet: walletStateReducer,
  ...drizzleReducers,
});
