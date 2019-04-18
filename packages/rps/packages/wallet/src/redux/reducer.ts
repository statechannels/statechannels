import * as states from './state';

import * as actions from './actions';
import { unreachable } from '../utils/reducer-utils';
import { clearOutbox } from './outbox/reducer';
import { accumulateSideEffects } from './outbox';
import { initializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { channelStateReducer } from './channel-state/reducer';
import { combineReducersWithSideEffects } from './../utils/reducer-utils';
import { createsNewProcess, routesToProcess, NewProcessAction } from './protocols/actions';
import * as indirectFunding from './protocols/indirect-funding/reducer';
import { ProtocolState } from './protocols';
import { WalletProtocol } from './types';

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
    return routeToNewProcessInitializer(state, action);
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

function routeToProtocolReducer(state: states.Initialized, action: actions.protocol.ProcessAction) {
  const processState = state.processStore[action.processId];
  if (!processState) {
    // Log warning?
    return state;
  } else {
    switch (processState.protocol) {
      case WalletProtocol.IndirectFunding:
        const { protocolState, sharedData } = indirectFunding.indirectFundingReducer(
          processState.protocolState,
          states.sharedData(state),
          action,
        );

        return updatedState(state, sharedData, processState, protocolState);

      default:
        // TODO: This should return unreachable(state), but right now, only some protocols are
        // "whitelisted" to run as a top-level process, which means we can't
        // exhaust all options
        return state;
    }
  }
}

function updatedState(
  state: states.Initialized,
  sharedData: states.SharedData,
  processState: states.ProcessState,
  protocolState: states.indirectFunding.IndirectFundingState,
) {
  const newState = { ...state, sharedData };
  const newProcessState = { ...processState, protocolState };
  newState.processStore = {
    ...newState.processStore,
    [processState.processId]: newProcessState,
  };
  return newState;
}

function routeToNewProcessInitializer(
  state: states.Initialized,
  action: actions.protocol.NewProcessAction,
) {
  switch (action.type) {
    case actions.indirectFunding.FUNDING_REQUESTED:
      const { protocolState, sharedData } = indirectFunding.initialize(
        action,
        states.sharedData(state),
      );

      return startProcess(state, sharedData, action, protocolState);
    default:
      return state;
    // TODO: Why is the discriminated union not working here?
    // return unreachable(action);
  }
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
function startProcess(
  state: states.Initialized,
  sharedData: states.SharedData,
  action: NewProcessAction,
  protocolState: ProtocolState,
): states.Initialized {
  const newState = { ...state, ...sharedData };
  const processId = action.channelId;
  const { protocol } = action;
  newState.processStore = {
    ...newState.processStore,
    [processId]: { processId, protocolState, channelsToMonitor: [], protocol },
  };

  return newState;
}
