// LOGIN
// =====

export const LOGIN_REQUEST = 'LOGIN.REQUEST';
export const LOGIN_SUCCESS = 'LOGIN.SUCCESS';
export const LOGIN_FAILURE = 'LOGIN.FAILURE';

export const loginRequest = () => ({
  type: LOGIN_REQUEST as typeof LOGIN_REQUEST,
});

export const loginSuccess = (user: object, player: { address: string; name: string; }) => ({
  type: LOGIN_SUCCESS as typeof LOGIN_SUCCESS,
  user,
  player,
});

export const loginFailure = (error: Error) => ({
  type: LOGIN_FAILURE as typeof LOGIN_FAILURE,
  error,
});

export type LoginRequest = ReturnType<typeof loginRequest>;
export type LoginSuccess = ReturnType<typeof loginSuccess>;
export type LoginFailure = ReturnType<typeof loginFailure>;
export type LoginResponse = LoginSuccess | LoginFailure;

// LOGOUT
// ======

export const LOGOUT_REQUEST = 'LOGOUT.REQUEST';
export const LOGOUT_SUCCESS = 'LOGOUT.SUCCESS';
export const LOGOUT_FAILURE = 'LOGOUT.FAILURE';

export const logoutRequest = () => ({
  type: LOGOUT_REQUEST as typeof LOGOUT_REQUEST,
});

export const logoutSuccess = () => ({
  type: LOGOUT_SUCCESS as typeof LOGOUT_SUCCESS,
});

export const logoutFailure = (error: Error) => ({
  type: LOGOUT_FAILURE as typeof LOGOUT_FAILURE,
  error,
});

export type LogoutRequest = ReturnType<typeof logoutRequest>;
export type LogoutSuccess = ReturnType<typeof logoutSuccess>;
export type LogoutFailure = ReturnType<typeof logoutFailure>;
export type LogoutResponse = LogoutSuccess | LogoutFailure;


// 

export type RequestAction = LoginRequest | LogoutRequest;
export type ResponseAction = LoginResponse | LogoutResponse;

export type AnyAction = RequestAction | ResponseAction;
