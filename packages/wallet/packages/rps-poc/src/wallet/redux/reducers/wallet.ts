import { combineReducers } from 'redux';
import { WalletState, walletStateReducer } from './wallet-state';
import { ChallengeState, challengeReducer } from './challenge';
import { displayReducer, DisplayState } from './display';

export interface Wallet {
  walletState: WalletState;
  challenge: ChallengeState;
  display: DisplayState;
  
}

export const walletReducer = combineReducers<Wallet>({
  walletState: walletStateReducer,
  challenge: challengeReducer,
  display:  displayReducer,
});