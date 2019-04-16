import * as states from './state';

import * as actions from './actions';
import { unreachable } from '../utils/reducer-utils';
import { clearOutbox } from './outbox/reducer';
import { accumulateSideEffects } from './outbox';
import { initializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { channelStateReducer } from './channel-state/reducer';
import { combineReducersWithSideEffects } from './../utils/reducer-utils';
import { createsNewProcess, routesToProcess } from './protocols/actions';

const initialState = states.waitForLogin();

export const walletReducer = (
  state: states.WalletState = initialState,
  action: actions.WalletAction,
): states.WalletState => {
  const nextState = { ...state, outboxState: clearOutbox(state.outboxState, action) };

  switch (nextState.type) {
    case states.WAIT_FOR_LOGIN:
      return waitForLoginReducer(nextState, action);
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
  if (createsNewProcess(action)) {
    routeToNewProcessInitializer(state, action);
  } else if (routesToProcess(action)) {
    return routeToProtocolReducer(state, action);
  }

  // Default to combined reducer
  const { state: newState, sideEffects } = combinedReducer(state, action);
  // Since the wallet state itself has an outbox state, we need to apply the side effects
  // by hand.
  return {
    ...state,
    ...newState,
    outboxState: accumulateSideEffects(state.outboxState, sideEffects),
  };
}

function routeToProtocolReducer(state, action) {
  // TODO: Call the protocol's reducer
  const processState = state.processStore[action.processId];
  if (!processState) {
    // Log warning?
    return state;
  } else {
    return state;
  }
}

function routeToNewProcessInitializer(state, action) {
  // TODO: Call the process creator
  return state;
}

const combinedReducer = combineReducersWithSideEffects({
  channelState: channelStateReducer,
});

const waitForLoginReducer = (
  state: states.WaitForLogin,
  action: actions.WalletAction,
): states.WalletState => {
  switch (action.type) {
    case actions.LOGGED_IN:
      return states.initialized({
        ...state,
        uid: action.uid,
        outboxState: accumulateSideEffects(state.outboxState, {
          messageOutbox: [initializationSuccess()],
        }),
        processStore: {},
      });
    default:
      return state;
  }
};
