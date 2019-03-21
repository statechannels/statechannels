import { SharedWalletState, base, LoggedIn, loggedIn, emptyState } from '../shared/state';

export const INITIALIZING = 'INITIALIZING';

export const WAIT_FOR_LOGIN = 'INITIALIZING.WAIT_FOR_LOGIN';
export const METAMASK_ERROR = 'INITIALIZING.METAMASK_ERROR';
export const WAIT_FOR_ADJUDICATOR = 'INITIALIZING.WAIT_FOR_ADJUDICATOR';

export interface WaitForLogin extends SharedWalletState {
  type: typeof WAIT_FOR_LOGIN;
  stage: typeof INITIALIZING;
}
export function waitForLogin(): WaitForLogin {
  return {
    type: WAIT_FOR_LOGIN,
    stage: INITIALIZING,
    ...emptyState,
  };
}

export interface WaitForAdjudicator extends LoggedIn {
  type: typeof WAIT_FOR_ADJUDICATOR;
  stage: typeof INITIALIZING;
}
export function waitForAdjudicator<T extends LoggedIn>(params: T): WaitForAdjudicator {
  return { ...loggedIn(params), type: WAIT_FOR_ADJUDICATOR, stage: INITIALIZING };
}

export interface MetaMaskError extends SharedWalletState {
  type: typeof METAMASK_ERROR;
  stage: typeof INITIALIZING;
}

export function metaMaskError<T extends SharedWalletState>(params: T): MetaMaskError {
  return { type: METAMASK_ERROR, stage: INITIALIZING, ...base(params) };
}

export type InitializingState = WaitForLogin | WaitForAdjudicator | MetaMaskError;
