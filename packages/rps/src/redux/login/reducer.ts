import {Reducer} from 'redux';
import * as loginActions from './actions';

export interface LoginState {
  loggedIn: boolean;
}

const initialState: LoginState = {
  loggedIn: false,
};

export const loginReducer: Reducer<LoginState> = (
  state = initialState,
  action: loginActions.LoginRequest | loginActions.LogoutRequest
) => {
  switch (action.type) {
    case loginActions.LOGIN_REQUEST:
    case loginActions.LOGOUT_REQUEST:
      return {
        ...state,
        loggedIn: !state.loggedIn,
      };
    default:
      return state;
  }
};
