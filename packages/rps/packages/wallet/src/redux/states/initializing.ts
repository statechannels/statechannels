import { Base, LoggedIn, loggedIn, base } from './shared';

export const INITIALIZING = 'INITIALIZING';

export const WAIT_FOR_LOGIN = 'WAIT_FOR_LOGIN';
export const WAIT_FOR_ADDRESS = 'WAIT_FOR_ADDRESS';
export const METAMASK_ERROR = 'METAMASK_ERROR';

export interface WaitForLogin extends Base {
  type: typeof WAIT_FOR_LOGIN;
  stage: typeof INITIALIZING;
}
export function waitForLogin<T extends Base>(params = {} as T): WaitForLogin {
  return { type: WAIT_FOR_LOGIN, stage: INITIALIZING, ...base(params) };
}

export interface WaitForAddress extends LoggedIn {
  type: typeof WAIT_FOR_ADDRESS;
  stage: typeof INITIALIZING;
}

export function waitForAddress<T extends LoggedIn>(params: T): WaitForAddress {
  return { ...loggedIn(params), type: WAIT_FOR_ADDRESS, stage: INITIALIZING };
}

export interface MetaMaskError extends Base {
  type: typeof METAMASK_ERROR;
  stage: typeof INITIALIZING;
}

export function metaMaskError<T extends Base>(params: T): MetaMaskError {
  return { type: METAMASK_ERROR, stage: INITIALIZING, ...base(params) };
}

export type InitializingState = WaitForLogin | WaitForAddress | MetaMaskError;
