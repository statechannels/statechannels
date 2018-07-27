import { types } from '../actions/login';

const initialState = {
  loading: false,
  loggedIn: false,
  user: null,
  wallet: null,
};

export default function loginReducer(state = initialState, action = {}) {
  switch (action.type) {
    case types.LOGIN.REQUEST:
    case types.LOGOUT.REQUEST:
      return {
        ...state,
        loading: true,
      };
    case types.LOGIN.FAILURE:
      return {
        ...state,
        loading: false,
      };
    case types.LOGOUT.FAILURE:
      return {
        ...state,
        loading: false,
      };
    case types.SYNC_USER:
      return {
        ...state,
        loading: false,
        loggedIn: action.user != null,
        user: action.user,
      };
    case types.SYNC_WALLET:
      return {
        ...state,
        loading: false,
        wallet: action.wallet,
      };
    case types.SYNC_USER_DETAILS:
      return {
        ...state,
        loading: false,
        loggedIn: action.user != null,
        user: action.user,
        wallet: action.wallet,
      };
    default:
      return state;
  }
};
