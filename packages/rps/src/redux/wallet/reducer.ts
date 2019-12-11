import {Reducer} from 'redux';
import * as walletActions from './actions';

export interface WalletState {
  loading: boolean;
  error: walletActions.WalletError | null;
  success: boolean;
}

const initialState: WalletState = {
  loading: true,
  error: null,
  success: false,
};

export const walletReducer: Reducer<WalletState> = (
  state = initialState,
  action: walletActions.WalletResponse
) => {
  switch (action.type) {
    case walletActions.WALLET_SUCCESS: {
      return {
        success: true,
        loading: false,
        error: null,
      };
    }
    case walletActions.WALLET_ERROR: {
      return {
        success: false,
        loading: false,
        error: action.error,
      };
    }
    default:
      return state;
  }
};
