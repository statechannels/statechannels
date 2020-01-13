import {Reducer} from 'redux';
import * as actions from './actions';
import {AutoPlayerState} from './state';

const initialState: AutoPlayerState = {
  enabled: false,
};

export const autoPlayerReducer: Reducer<AutoPlayerState> = (
  state = initialState,
  action: actions.AutoPlayerAction
) => {
  switch (action.type) {
    case 'StartAutoPlayer':
      return {...state, enabled: true, player: action.player};
    case 'StopAutoPlayer':
      return {...state, enabled: false, player: action.player};
  }
};
