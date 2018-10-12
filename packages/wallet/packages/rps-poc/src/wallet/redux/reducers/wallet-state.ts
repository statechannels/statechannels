import { Reducer } from 'redux';
import * as stateActions from '../actions/state';
import { PlayerAState } from '../../wallet-engine/wallet-states/PlayerA';
import { PlayerBState } from '../../wallet-engine/wallet-states/PlayerB';

export type WalletState = PlayerAState | PlayerBState | null;
const initialState = null;

export const walletStateReducer: Reducer<WalletState> = (state=initialState, action: stateActions.StateChanged) => {
  switch (action.type) {
    case  stateActions.STATE_CHANGED:
      return action.state;
    default:
      return state;
  }
};
