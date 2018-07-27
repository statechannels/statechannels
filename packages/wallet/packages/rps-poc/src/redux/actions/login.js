export const types = {
  LOGIN: {
    REQUEST: 'LOGIN.REQUEST',
    SUCCESS: 'LOGIN.SUCCESS',
    FAILURE: 'LOGIN.FAILURE',
  },
  LOGOUT: {
    REQUEST: 'LOGOUT.REQUEST',
    SUCCESS: 'LOGOUT.SUCCESS',
    FAILURE: 'LOGOUT.FAILURE',
  },
  SYNC_WALLET: 'SYNC_WALLET',
};

export const login = () => ({
  type: types.LOGIN.REQUEST,
});

export const loginFailure = error => ({
  type: types.LOGIN.FAILURE,
  error,
});

export const logout = () => ({
  type: types.LOGOUT.REQUEST,
});

export const logoutFailure = error => ({
  type: types.LOGOUT.FAILURE,
  error,
});

export const loginSuccess = (user, wallet) => ({
  type: types.LOGIN.SUCCESS,
  user,
  wallet,
});

export const logoutSuccess = () => ({
  type: types.LOGOUT.SUCCESS,
});

export const syncWallet = (wallet) => ({
  type: types.SYNC_WALLET,
  wallet
});

