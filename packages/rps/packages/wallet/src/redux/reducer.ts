import { WalletState, INITIALIZING, waitForLogin, WALLET_INITIALIZED } from './state';

import { initializingReducer } from './initializing/reducer';
import * as actions from './actions';
import { unreachable } from '../utils/reducer-utils';
import { initializedReducer } from './initialized/reducer';

const initialState = waitForLogin();

export const walletReducer = (
  state: WalletState = initialState,
  action: actions.WalletAction,
): WalletState => {
  const nextOutbox = { ...state.outboxState };
  if (action.type === actions.MESSAGE_SENT) {
    nextOutbox.messageOutbox = nextOutbox.messageOutbox.slice(1);
  }
  if (action.type === actions.DISPLAY_MESSAGE_SENT) {
    nextOutbox.displayOutbox = nextOutbox.displayOutbox.slice(1);
  }
  if (action.type === actions.TRANSACTION_SENT_TO_METAMASK) {
    // TODO: Should this be a channel message?
    nextOutbox.transactionOutbox = nextOutbox.transactionOutbox.slice(1);
  }

  if (action.type.match('WALLET.INTERNAL')) {
    // For the moment, only one action should ever be put in the actionOutbox,
    // so it's always safe to clear it.
    nextOutbox.actionOutbox = nextOutbox.actionOutbox.slice(1);
  }

  const nextState = { ...state, outboxState: nextOutbox };
  switch (nextState.stage) {
    case INITIALIZING:
      return initializingReducer(nextState, action);
    case WALLET_INITIALIZED:
      return initializedReducer(nextState, action);
    default:
      return unreachable(nextState);
  }
};
