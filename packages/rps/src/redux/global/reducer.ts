import {Reducer} from 'redux';

import * as actions from './actions';
import {OverlayState} from './state';

const initialState: OverlayState = {
  rulesVisible: false,
  walletVisible: false,
};

export const overlayReducer: Reducer<OverlayState> = (state = initialState, action: any) => {
  switch (action.type) {
    case actions.TOGGLE_RULES_VISIBILITY:
      return {...state, rulesVisible: !state.rulesVisible};
    case actions.SHOW_WALLET:
      return {...state, walletVisible: true};
    case actions.HIDE_WALLET:
      return {...state, walletVisible: false};
    default:
      // unreachable
      return state;
  }
};
