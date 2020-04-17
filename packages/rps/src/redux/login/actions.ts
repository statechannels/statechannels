// LOGIN
// =====

export const LOGIN_REQUEST = 'LOGIN.REQUEST';

export const loginRequest = () => ({
  type: LOGIN_REQUEST as typeof LOGIN_REQUEST,
});

export type LoginRequest = ReturnType<typeof loginRequest>;

// LOGOUT
// ======

export const LOGOUT_REQUEST = 'LOGOUT.REQUEST';

export const logoutRequest = () => ({
  type: LOGOUT_REQUEST as typeof LOGOUT_REQUEST,
});

export type LogoutRequest = ReturnType<typeof logoutRequest>;
