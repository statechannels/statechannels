import {Reducer} from 'redux';
import * as loginActions from './actions';

export interface LoginState {
  loading: boolean;
  loggedIn: boolean;
  user: any;
  error: string | undefined;
}

const initialState: LoginState = {
  loading: false,
  loggedIn: false,
  user: null,
  error: undefined,
};

export const loginReducer: Reducer<LoginState> = (
  state = initialState,
  action: loginActions.AnyAction
) => {
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
      };
    case loginActions.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    case loginActions.LOGOUT_SUCCESS:
      return initialState;
    case loginActions.LOGOUT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    default:
      return state;
  }
};
