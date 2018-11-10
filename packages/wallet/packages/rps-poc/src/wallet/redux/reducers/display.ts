import { Reducer } from 'redux';
import { ShowWallet, HideWallet, SHOW_WALLET, HIDE_WALLET, ShowHeader, HIDE_WALLET_HEADER, SHOW_WALLET_HEADER, HideHeader } from '../actions/display';
export interface DisplayState {
  showWallet: boolean;
  showFooter: boolean;
}
const initialState = {
  showWallet: false,
  showFooter: false,
};

// todo: Header/Footer is still inconsistent. Change to be Maximised/Minimised

type DisplayAction = ShowWallet | HideWallet | ShowHeader | HideHeader;
export const displayReducer: Reducer<DisplayState> = (state = initialState, action: DisplayAction) => {
  switch (action.type) {
    case SHOW_WALLET:
      return { ...state, showWallet: true };
    case HIDE_WALLET:
      return { ...state, showWallet: false };
    case SHOW_WALLET_HEADER:
      return { ...state, showFooter: true };
    case HIDE_WALLET_HEADER:
      return { ...state, showFooter: false };
    default:
      return state;
  }
};
