import { combineReducers } from 'redux';
import { ChannelState, channelStateReducer } from './channel';
import { ChallengeState, challengeReducer } from './challenge';
import { displayReducer, DisplayState } from './display';
import { AddressState, addressReducer } from './address';

export interface WalletState {
  channelState: ChannelState;
  challenge: ChallengeState;
  display: DisplayState;
  address: AddressState;
}

export const walletReducer = combineReducers<WalletState>({
  channelState: channelStateReducer,
  challenge: challengeReducer,
  display: displayReducer,
  address: addressReducer,
});
