import { WalletState, INITIALIZING, waitForLogin, WALLET_INITIALIZED } from './state';

import { initializingReducer } from './initializing/reducer';
import * as actions from './actions';
import { unreachable } from '../utils/reducer-utils';
import { initializedReducer } from './initialized/reducer';
import { clearOutbox } from './outbox/reducer';

const initialState = waitForLogin();

export const walletReducer = (
  state: WalletState = initialState,
  action: actions.WalletAction,
): WalletState => {
  const nextState = { ...state, outboxState: clearOutbox(state.outboxState, action) };

  switch (nextState.stage) {
    case INITIALIZING:
      return initializingReducer(nextState, action);
    case WALLET_INITIALIZED:
      return initializedReducer(nextState, action);
    default:
      return unreachable(nextState);
  }
};
