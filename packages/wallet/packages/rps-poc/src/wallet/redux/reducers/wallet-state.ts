import { Reducer } from 'redux';
import { State} from '../../wallet-engine/wallet-states';
import * as stateActions from '../actions/state';

export type WalletState = State | null;
const initialState = null;

export const walletStateReducer: Reducer<WalletState> = (state=initialState, action: stateActions.StateChanged) => {
  switch (action.type) {
    case  stateActions.STATE_CHANGED:
      return action.state;
    default:
      return state;
  }
}
