import { Reducer } from 'redux';
import { ShowWallet, HideWallet, SHOW_WALLET, HIDE_WALLET, ShowHeader, HIDE_WALLET_HEADER, SHOW_WALLET_HEADER, HideHeader } from '../actions/display';
export interface DisplayState {
  showWallet: boolean;
  showHeader: boolean;
}
const initialState = {
  showWallet: false,
  showHeader: false,
};
type DisplayAction = ShowWallet | HideWallet | ShowHeader | HideHeader;
export const displayReducer: Reducer<DisplayState> = (state = initialState, action: DisplayAction) => {
  switch (action.type) {
    case SHOW_WALLET:
      return { ...state, showWallet: true };
    case HIDE_WALLET:
      return { ...state, showWallet: false };
    case SHOW_WALLET_HEADER:
      return { ...state, showHeader: true };
    case HIDE_WALLET_HEADER:
      return { ...state, showHeader: false };
    default:
      return state;
  }
};
