import { WalletState, INITIALIZING, waitForLogin, WALLET_INITIALIZED } from '../states';

import { initializingReducer } from './initializing';
import {
  WalletAction,
  MESSAGE_SENT,
  TRANSACTION_SENT_TO_METAMASK,
  DISPLAY_MESSAGE_SENT,
} from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { OutboxState, SharedWalletState } from '../states/shared';
import { initializedReducer } from './initialized';

const initialState = waitForLogin();

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletAction,
): WalletState => {
  const nextOutbox: OutboxState = {};
  if (action.type === MESSAGE_SENT) {
    nextOutbox.messageOutbox = undefined;
  }
  if (action.type === DISPLAY_MESSAGE_SENT) {
    nextOutbox.displayOutbox = undefined;
  }
  if (action.type === TRANSACTION_SENT_TO_METAMASK) {
    nextOutbox.transactionOutbox = undefined;
  }
  state = sideEffectsReducer(state, nextOutbox);

  switch (state.stage) {
    case INITIALIZING:
      return initializingReducer(state, action);
    case WALLET_INITIALIZED:
      return initializedReducer(state, action);
    default:
      return unreachable(state);
  }
};

/**
 *
 * @param state current global state
 * @param sideEffects: OutboxState -- side effects that the channel reducer declared should happen
 *
 * For each key k in sideEffects, replace state.outboxState[k] with sideEffects[k]
 */
export function sideEffectsReducer<T extends SharedWalletState>(
  state: T,
  sideEffects: OutboxState | undefined,
): T {
  if (!sideEffects) {
    return state;
  }
  // Defensively copy object as to not modify existing state
  const newState = { ...state, outboxState: { ...state.outboxState } };

  // TODO: We need to think about whether to overwrite existing outbox items.
  Object.keys(sideEffects).map(k => (newState.outboxState[k] = sideEffects[k]));

  return newState;
}
