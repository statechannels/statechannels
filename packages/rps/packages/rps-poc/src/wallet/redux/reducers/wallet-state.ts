import { Reducer } from 'redux';
import { State} from '../../wallet-engine/wallet-states';
import { WalletStateChangedAction, WalletStateActionType } from '../actions/wallet-state';

export type WalletState = State | null;
const initialState = null;

export const walletStateReducer: Reducer<WalletState> = (state=initialState, action: WalletStateChangedAction) => {
  switch (action.type) {
    case  WalletStateActionType.STATE_CHANGED:
      return action.state;
    default:
      return state;
  }
}
