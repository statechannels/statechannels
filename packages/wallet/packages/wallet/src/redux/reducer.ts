import { WalletState, INITIALIZING, waitForLogin, WALLET_INITIALIZED } from './state';

import { initializingReducer } from './initializing/reducer';
import {
  WalletAction,
  MESSAGE_SENT,
  TRANSACTION_SENT_TO_METAMASK,
  DISPLAY_MESSAGE_SENT,
} from './actions';
import { unreachable } from '../utils/reducer-utils';
import { OutboxState } from './outbox/state';
import { initializedReducer } from './initialized/reducer';
import { applySideEffects } from './outbox';

const initialState = waitForLogin();

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletAction,
): WalletState => {
  const sideEffects: OutboxState = {};
  if (action.type === MESSAGE_SENT) {
    sideEffects.messageOutbox = undefined;
  }
  if (action.type === DISPLAY_MESSAGE_SENT) {
    sideEffects.displayOutbox = undefined;
  }
  if (action.type === TRANSACTION_SENT_TO_METAMASK) {
    sideEffects.transactionOutbox = undefined;
  }

  if (action.type.match('WALLET.INTERNAL')) {
    // For the moment, only one action should ever be put in the actionOutbox,
    // so it's always safe to clear it.
    sideEffects.actionOutbox = undefined;
  }
  state = { ...state, outboxState: applySideEffects(state.outboxState, sideEffects) };

  switch (state.stage) {
    case INITIALIZING:
      return initializingReducer(state, action);
    case WALLET_INITIALIZED:
      return initializedReducer(state, action);
    default:
      return unreachable(state);
  }
};
