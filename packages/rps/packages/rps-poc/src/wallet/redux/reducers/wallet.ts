import { combineReducers } from 'redux';
import { WalletState, walletStateReducer } from './wallet-state';
import { ChallengeState, challengeReducer } from './challenge';
import { displayReducer, DisplayState } from './display';
import { AddressState, addressReducer } from './address';

export interface Wallet {
  walletState: WalletState;
  challenge: ChallengeState;
  display: DisplayState;
  address: AddressState;

}

export const walletReducer = combineReducers<Wallet>({
  walletState: walletStateReducer,
  challenge: challengeReducer,
  display: displayReducer,
  address: addressReducer,
});
