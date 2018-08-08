import { ActionsUnion } from './type-helpers';

import ChannelWallet from '../../game-engine/ChannelWallet';

export enum LoginActionType {
  LOGIN_REQUEST = 'LOGIN.REQUEST',
  LOGIN_SUCCESS = 'LOGIN.SUCCESS',
  LOGIN_FAILURE = 'LOGIN.FAILURE',
  LOGOUT_REQUEST = 'LOGOUT.REQUEST',
  LOGOUT_SUCCESS = 'LOGOUT.SUCCESS',
  LOGOUT_FAILURE = 'LOGOUT.FAILURE',
};

export const LoginAction = {
  login: () => ({
    type: LoginActionType.LOGIN_REQUEST as typeof LoginActionType.LOGIN_REQUEST,
  }),

  loginFailure: (error: Error) => ({
    type: LoginActionType.LOGIN_FAILURE as typeof LoginActionType.LOGIN_FAILURE,
    error,
  }),

  logout: () => ({
    type: LoginActionType.LOGOUT_REQUEST as typeof LoginActionType.LOGOUT_REQUEST,
  }),

  logoutFailure: (error: Error) => ({
    type: LoginActionType.LOGOUT_FAILURE as typeof LoginActionType.LOGOUT_FAILURE,
    error,
  }),

  loginSuccess: (user: object, wallet: ChannelWallet, player: object) => ({
    type: LoginActionType.LOGIN_SUCCESS as typeof LoginActionType.LOGIN_SUCCESS,
    user,
    wallet,
    player,
  }),

  logoutSuccess: () => ({
    type: LoginActionType.LOGOUT_SUCCESS as typeof LoginActionType.LOGOUT_SUCCESS,
  }),
};

export type LoginAction = ActionsUnion<typeof LoginAction>;
