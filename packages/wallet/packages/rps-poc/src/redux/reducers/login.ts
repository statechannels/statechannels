import { Reducer } from 'redux';
import { LoginActionType, LoginAction } from '../actions/login';

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

export const loginReducer: Reducer<LoginState> = (state = initialState, action: LoginAction) => {
  switch (action.type) {
    case LoginActionType.LOGIN_REQUEST:
    case LoginActionType.LOGOUT_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case LoginActionType.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        loggedIn: true,
        user: action.user,
        player: action.player,
      };
    case LoginActionType.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
      };
    case LoginActionType.LOGOUT_SUCCESS:
      return initialState;
    case LoginActionType.LOGOUT_FAILURE:
      return {
        ...state,
        loading: false,
      };
    default:
      return state;
  }
};
