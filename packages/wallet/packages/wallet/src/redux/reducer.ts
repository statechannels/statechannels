import { initializationSuccess } from 'magmo-wallet-client/lib/wallet-events';
import { unreachable } from '../utils/reducer-utils';
import * as actions from './actions';
import { accumulateSideEffects } from './outbox';
import { clearOutbox } from './outbox/reducer';
import { ProtocolState } from './protocols';
import { isNewProcessAction, isProtocolAction, NewProcessAction } from './protocols/actions';
import * as applicationProtocol from './protocols/application';
import * as challengeProtocol from './protocols/challenging';
import * as concludeProtocol from './protocols/concluding';
import * as fundProtocol from './protocols/funding';
import * as challengeResponseProtocol from './protocols/responding';
import * as states from './state';
import { WalletProtocol } from './types';
import { APPLICATION_PROCESS_ID } from './protocols/application/reducer';

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

function routeToProtocolReducer(
  state: states.Initialized,
  action: actions.ProtocolAction,
): states.Initialized {
  const processState = state.processStore[action.processId];
  if (!processState) {
    // Log warning?
    return state;
  } else {
    switch (processState.protocol) {
      case WalletProtocol.Funding:
        const { protocolState, sharedData } = fundProtocol.reducer(
          processState.protocolState,
          states.sharedData(state),
          action,
        );

        return updatedState(state, sharedData, processState, protocolState);
      case WalletProtocol.Application:
        const {
          protocolState: appProtocolState,
          sharedData: appSharedData,
        } = applicationProtocol.reducer(
          processState.protocolState,
          states.sharedData(state),
          action,
        );
        return updatedState(state, appSharedData, processState, appProtocolState);
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
  protocolState: ProtocolState,
) {
  const newState = { ...state, ...sharedData };
  const newProcessState = { ...processState, protocolState };
  newState.processStore = {
    ...newState.processStore,
    [processState.processId]: newProcessState,
  };
  return newState;
}

function getProcessId(action: NewProcessAction): string {
  if ('channelId' in action) {
    return action.channelId;
  }
  return APPLICATION_PROCESS_ID;
}

function initializeNewProtocol(
  state: states.Initialized,
  action: actions.protocol.NewProcessAction,
): { protocolState: ProtocolState; sharedData: states.SharedData } {
  const processId = getProcessId(action);
  const incomingSharedData = states.sharedData(state);
  switch (action.type) {
    case actions.protocol.FUNDING_REQUESTED: {
      const { channelId } = action;
      return fundProtocol.initialize(incomingSharedData, channelId, processId, action.playerIndex);
    }
    case actions.protocol.CONCLUDE_REQUESTED: {
      const { channelId } = action;
      const { state: protocolState, storage: sharedData } = concludeProtocol.initialize(
        channelId,
        processId,
        incomingSharedData,
      );
      return { protocolState, sharedData };
    }
    case actions.protocol.CREATE_CHALLENGE_REQUESTED: {
      const { channelId } = action;
      const { state: protocolState, storage: sharedData } = challengeProtocol.initialize(
        channelId,
        processId,
        incomingSharedData,
      );
      return { protocolState, sharedData };
    }
    case actions.protocol.RESPOND_TO_CHALLENGE_REQUESTED:
      return challengeResponseProtocol.initialize(processId, incomingSharedData, action.commitment);
    case actions.protocol.INITIALIZE_CHANNEL:
      return applicationProtocol.initialize(incomingSharedData);
    default:
      return unreachable(action);
  }
}

function routeToNewProcessInitializer(
  state: states.Initialized,
  action: actions.protocol.NewProcessAction,
): states.Initialized {
  const processId = getProcessId(action);
  const { protocolState, sharedData } = initializeNewProtocol(state, action);
  return startProcess(state, sharedData, action, protocolState, processId);
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
  // TODO: Right now any new processId get sets to the current process Id.
  // We probably need a priority queue so some protocols can override another
  // IE: Responding to a challenge is higher priority than funding.
  newState.currentProcessId = processId;

  return newState;
}
