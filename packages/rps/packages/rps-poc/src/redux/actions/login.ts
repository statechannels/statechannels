import ChannelWallet from '../../game-engine/ChannelWallet';

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
};

export const login = () => ({
  type: types.LOGIN.REQUEST,
});

export const loginFailure = (error: Error) => ({
  type: types.LOGIN.FAILURE,
  error,
});

export const logout = () => ({
  type: types.LOGOUT.REQUEST,
});

export const logoutFailure = (error: Error) => ({
  type: types.LOGOUT.FAILURE,
  error,
});

export const loginSuccess = (user: object, wallet: ChannelWallet, player: object) => ({
  type: types.LOGIN.SUCCESS,
  user,
  wallet,
  player,
});

export const logoutSuccess = () => ({
  type: types.LOGOUT.SUCCESS,
});
