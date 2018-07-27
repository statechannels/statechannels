export const types = {
  LOGIN: {
    REQUEST: 'LOGIN.REQUEST',
    FAILURE: 'LOGIN.FAILURE'
  },
  LOGOUT: {
    REQUEST: 'LOGOUT.REQUEST',
    FAILURE: 'LOGOUT.FAILURE'
  },
  SYNC_USER: 'SYNC_USER',
  SYNC_USER_DETAILS: 'SYNC_USER_DETAILS',
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

export const syncUser = user => ({
  type: types.SYNC_USER,
  user,
});

export const syncUserDetails = (user, wallet) => ({
  type: types.SYNC_USER_DETAILS,
  user,
  wallet,
});

export const syncWallet = (wallet) => ({
  type: types.SYNC_WALLET,
  wallet
});

