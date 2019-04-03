import * as states from './state';

import * as actions from './actions';
import { unreachable } from '../utils/reducer-utils';
import { clearOutbox } from './outbox/reducer';
import { accumulateSideEffects } from './outbox';
import { initializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { channelStateReducer } from './channel-state/reducer';
import { fundingStateReducer } from './funding-state/reducer';
import { combineReducersWithSideEffects } from './../utils/reducer-utils';

const initialState = states.waitForLogin();

export const walletReducer = (
  state: states.WalletState = initialState,
  action: actions.WalletAction,
): states.WalletState => {
  const nextState = { ...state, outboxState: clearOutbox(state.outboxState, action) };

  switch (nextState.type) {
    case states.WAIT_FOR_LOGIN:
      return waitForLoginReducer(nextState, action);
    case states.WAIT_FOR_ADJUDICATOR:
      return waitForAdjudicatorReducer(nextState, action);
    case states.METAMASK_ERROR:
      // We stay in the metamask error state until a change to
      // metamask settings forces a refresh
      return state;
    case states.WALLET_INITIALIZED:
      return initializedReducer(nextState, action);
    default:
      return unreachable(nextState);
  }
};

export function initializedReducer(
  state: states.Initialized,
  action: actions.WalletAction,
): states.WalletState {
  const { state: newState, sideEffects } = combinedReducer(state, action);
  // Since the wallet state itself has an outbox state, we need to apply the side effects
  // by hand.
  return {
    ...state,
    ...newState,
    outboxState: accumulateSideEffects(state.outboxState, sideEffects),
  };
}

const combinedReducer = combineReducersWithSideEffects({
  channelState: channelStateReducer,
  fundingState: fundingStateReducer,
});

const waitForLoginReducer = (
  state: states.WaitForLogin,
  action: actions.WalletAction,
): states.WalletState => {
  switch (action.type) {
    case actions.LOGGED_IN:
      return states.waitForAdjudicator({ ...state, uid: action.uid });
    default:
      return state;
  }
};

const waitForAdjudicatorReducer = (
  state: states.WaitForAdjudicator,
  action: any,
): states.WalletState => {
  switch (action.type) {
    case actions.ADJUDICATOR_KNOWN:
      const { adjudicator, networkId } = action;
      return states.initialized({
        ...state,
        outboxState: accumulateSideEffects(state.outboxState, {
          messageOutbox: [initializationSuccess()],
        }),
        adjudicator,
        networkId,
      });
    default:
      return state;
  }
};
