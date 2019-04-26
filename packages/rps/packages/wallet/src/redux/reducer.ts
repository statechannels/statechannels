import * as states from './state';

import * as actions from './actions';
import { unreachable } from '../utils/reducer-utils';
import { clearOutbox } from './outbox/reducer';
import { accumulateSideEffects } from './outbox';
import { initializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { NewProcessAction, isNewProcessAction, isProtocolAction } from './protocols/actions';
import * as funding from './protocols/funding/reducer';
import { ProtocolState } from './protocols';
import { WalletProtocol } from './types';
import { FundingState } from './protocols/funding/states';

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
  // TODO: We will need to update SharedData here first
  if (isNewProcessAction(action)) {
    return routeToNewProcessInitializer(state, action);
  } else if (isProtocolAction(action)) {
    return routeToProtocolReducer(state, action);
  }

  return state;
}

function routeToProtocolReducer(state: states.Initialized, action: actions.ProtocolAction) {
  const processState = state.processStore[action.processId];
  if (!processState) {
    // Log warning?
    return state;
  } else {
    switch (processState.protocol) {
      case WalletProtocol.Funding:
        const { protocolState, sharedData } = funding.fundingReducer(
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
  protocolState: FundingState,
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
): states.Initialized {
  switch (action.type) {
    case actions.protocol.FUNDING_REQUESTED:
      const processId = action.channelId;
      const { protocolState, sharedData } = funding.initialize(
        states.sharedData(state),
        processId,
        action.channelId,
        action.playerIndex,
      );

      return startProcess(state, sharedData, action, protocolState, processId);
    case actions.protocol.CONCLUDE_REQUESTED:
    case actions.protocol.CREATE_CHALLENGE_REQUESTED:
    case actions.protocol.RESPOND_TO_CHALLENGE_REQUESTED:
      return state;
    default:
      return unreachable(action);
  }
}

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
        adjudicatorStore: {},
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
  processId: string,
): states.Initialized {
  const newState = { ...state, ...sharedData };
  const { protocol } = action;
  newState.processStore = {
    ...newState.processStore,
    [processId]: { processId, protocolState, channelsToMonitor: [], protocol },
  };
  // TODO: Right now any new processId get sets to the current process Id. We might need to be smarter about this in the future.
  newState.currentProcessId = processId;

  return newState;
}
