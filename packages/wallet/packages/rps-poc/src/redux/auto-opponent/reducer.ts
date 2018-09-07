import { Reducer } from 'redux';

import * as actions from './actions';

export const autoOpponentReducer: Reducer<string> = (state = "", action: actions.AnyAction) => {
  switch (action.type) {
    case actions.INITIALIZATION_SUCCESS:
      return action.address;
    default:
      return state;
  }
}
