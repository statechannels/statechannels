import _ from "lodash";

import {Wallet} from "ethers";

import {unreachable} from "../utils/reducer-utils";

import {isStartProcessAction, ProcessProtocol} from "../communication";

import * as communication from "../communication";

import * as actions from "./actions";

import {clearOutbox} from "./outbox/reducer";
import {ProtocolState} from "./protocols";
import {isNewProcessAction, NewProcessAction} from "./protocols/actions";
import * as applicationProtocol from "./protocols/application";
import * as concludingProtocol from "./protocols/concluding";
import * as fundProtocol from "./protocols/funding";
import * as states from "./state";
import {APPLICATION_PROCESS_ID} from "./protocols/application/reducer";
import {adjudicatorStateReducer} from "./adjudicator-state/reducer";

import * as closeLedgerChannelProtocol from "./protocols/close-ledger-channel";

import {assetHolderStateReducer} from "./asset-holders-state/reducer";

// If we're generating the initial state then we need to create a new key for the user
const {address, privateKey} = Wallet.createRandom();

const initialState: states.Initialized = states.initialized({
  ...states.EMPTY_SHARED_DATA,
  address,
  privateKey,
  processStore: {}
});

export const walletReducer = (
  state: states.WalletState = initialState,
  action: actions.WalletAction
): states.WalletState => {
  const nextState = {...state, outboxState: clearOutbox(state.outboxState, action)};
  return initializedReducer(nextState, action);
};

export function initializedReducer(
  state: states.Initialized,
  action: actions.WalletAction
): states.WalletState {
  let newState = {...state};

  if (actions.isSharedDataUpdateAction(action)) {
    newState = updateSharedData(newState, action);
  }

  if (isNewProcessAction(action)) {
    return routeToNewProcessInitializer(newState, action);
  } else if (actions.isProtocolAction(action)) {
    return routeToProtocolReducer(newState, action);
  }

  return newState;
}

function updateSharedData(
  state: states.Initialized,
  action: actions.SharedDataUpdateAction
): states.Initialized {
  if (actions.isAdjudicatorEventAction(action)) {
    return {...state, adjudicatorState: adjudicatorStateReducer(state.adjudicatorState, action)};
  } else if (actions.isAssetHolderEventAction(action)) {
    return {...state, assetHoldersState: assetHolderStateReducer(state.assetHoldersState, action)};
  } else if (action.type === "WALLET.APP_DEFINITION_BYTECODE_RECEIVED") {
    return {
      ...state,
      bytecodeStorage: {...state.bytecodeStorage, [action.appDefinition]: action.bytecode}
    };
  } else {
    return state;
  }
}

function routeToProtocolReducer(
  state: states.Initialized,
  action: actions.ProtocolAction
): states.Initialized {
  const processState = state.processStore[action.processId];
  if (!processState) {
    console.warn("No process");
    return state;
  } else {
    switch (processState.protocol) {
      case ProcessProtocol.Funding:
        const {protocolState, sharedData} = fundProtocol.fundingReducer(
          processState.protocolState,
          states.sharedData(state),
          action
        );
        return updatedState(state, sharedData, processState, protocolState, action.processId);
      case ProcessProtocol.Application:
        const {
          protocolState: appProtocolState,
          sharedData: appSharedData
        } = applicationProtocol.reducer(
          processState.protocolState,
          states.sharedData(state),
          action
        );
        return updatedState(state, appSharedData, processState, appProtocolState, action.processId);
      case ProcessProtocol.Concluding:
        const {
          protocolState: concludingProtocolState,
          sharedData: concludingSharedData
        } = concludingProtocol.concludingReducer(
          processState.protocolState,
          states.sharedData(state),
          action
        );
        return updatedState(
          state,
          concludingSharedData,
          processState,
          concludingProtocolState,
          action.processId
        );

      case ProcessProtocol.CloseLedgerChannel:
        const {
          protocolState: closeLedgerChannelState,
          sharedData: closeLedgerChannelSharedData
        } = closeLedgerChannelProtocol.closeLedgerChannelReducer(
          processState.protocolState,
          states.sharedData(state),
          action
        );
        return updatedState(
          state,
          closeLedgerChannelSharedData,
          processState,
          closeLedgerChannelState,
          action.processId
        );
      default:
        return unreachable(processState.protocol);
    }
  }
}

function updatedState(
  state: states.Initialized,
  sharedData: states.SharedData,
  processState: states.ProcessState,
  protocolState: ProtocolState,
  processId: string
) {
  if (states.isTerminalProtocolState(protocolState)) {
    return endProcess(state, sharedData, processId);
  } else {
    const newState = {...state, ...sharedData};
    const newProcessState = {...processState, protocolState};
    newState.processStore = {
      ...newState.processStore,
      [processState.processId]: newProcessState
    };
    return newState;
  }
}

export function getProcessId(action: NewProcessAction): string {
  if (isStartProcessAction(action)) {
    return communication.getProcessId(action);
  } else if (action.type === "WALLET.NEW_PROCESS.INITIALIZE_CHANNEL") {
    return APPLICATION_PROCESS_ID;
  } else if ("channelId" in action) {
    return `${action.protocol}-${action.channelId}`;
  }
  throw new Error("Invalid action");
}

function initializeNewProtocol(
  state: states.Initialized,
  action: NewProcessAction
): {protocolState: ProtocolState; sharedData: states.SharedData} {
  const processId = getProcessId(action);
  const incomingSharedData = states.sharedData(state);
  // TODO do not reinitialise an existing process
  switch (action.type) {
    case "WALLET.NEW_PROCESS.FUNDING_REQUESTED": {
      const {channelId} = action;
      return fundProtocol.initializeFunding(incomingSharedData, processId, channelId);
    }
    case "WALLET.NEW_PROCESS.CONCLUDE_REQUESTED": {
      const {channelId} = action;
      const {protocolState, sharedData} = concludingProtocol.initialize({
        channelId,
        processId,
        opponentInstigatedConclude: false,
        sharedData: incomingSharedData
      });
      return {protocolState, sharedData};
    }
    case "WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED": {
      const {channelId} = action;
      const {protocolState, sharedData} = concludingProtocol.initialize({
        channelId,
        processId,
        opponentInstigatedConclude: true,
        sharedData: incomingSharedData
      });
      return {protocolState, sharedData};
    }
    case "WALLET.NEW_PROCESS.INITIALIZE_CHANNEL":
      return applicationProtocol.initialize(
        incomingSharedData,
        action.channelId,
        state.address,
        state.privateKey,
        action.participants
      );
    case "WALLET.NEW_PROCESS.CLOSE_LEDGER_CHANNEL":
      return closeLedgerChannelProtocol.initializeCloseLedgerChannel(
        processId,
        action.channelId,
        incomingSharedData,
        true
      );
    default:
      return unreachable(action);
  }
}

function routeToNewProcessInitializer(
  state: states.Initialized,
  action: NewProcessAction
): states.Initialized {
  const processId = getProcessId(action);
  const {protocolState, sharedData} = initializeNewProtocol(state, action);
  return startProcess(state, sharedData, action, protocolState, processId);
}

function endProcess(
  state: states.Initialized,
  sharedData: states.SharedData,
  processId: string
): states.Initialized {
  const newState = _.cloneDeep({...state, ...sharedData});
  delete newState.processStore[processId];
  newState.currentProcessId = undefined;
  return newState;
}
function startProcess(
  state: states.Initialized,
  sharedData: states.SharedData,
  action: NewProcessAction,
  protocolState: ProtocolState,
  processId: string
): states.Initialized {
  const newState = {...state, ...sharedData};
  const {protocol} = action;
  newState.processStore = {
    ...newState.processStore,
    [processId]: {processId, protocolState, channelsToMonitor: [], protocol}
  };
  // TODO: Right now any new processId get sets to the current process Id.
  // We probably need a priority queue so some protocols can override another
  // IE: Responding to a challenge is higher priority than funding.
  newState.currentProcessId = processId;

  return newState;
}
