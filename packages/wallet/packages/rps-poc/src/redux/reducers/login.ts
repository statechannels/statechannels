import { Reducer } from 'redux';
import * as loginActions from '../actions/login';

export interface LoginState {
  loading: boolean;
  loggedIn: boolean;
  user: any;
  player?: {
    address: string;
    name: string;
  };
}

const initialState: LoginState = {
  loading: false,
  loggedIn: false,
  user: null,
  player: undefined,
};

export const loginReducer: Reducer<LoginState> = (state = initialState, action: loginActions.AnyAction) => {
  switch (action.type) {
    case loginActions.LOGIN_REQUEST:
    case loginActions.LOGOUT_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case loginActions.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        loggedIn: true,
        user: action.user,
        player: action.player,
      };
    case loginActions.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
      };
    case loginActions.LOGOUT_SUCCESS:
      return initialState;
    case loginActions.LOGOUT_FAILURE:
      return {
        ...state,
        loading: false,
      };
    default:
      return state;
  }
};
