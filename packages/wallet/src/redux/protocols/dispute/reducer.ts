import {SharedData} from "../../state";

import {ProtocolAction} from "../../actions";

import {DisputeState, isTerminal} from "./state";
import {responderReducer} from "./responder/reducer";
import {challengerReducer} from "./challenger/reducer";
import {isNonTerminalResponderState} from "./responder/states";
import {isResponderAction} from "./responder/actions";
import {isChallengerAction} from "./challenger/actions";

import {ProtocolStateWithSharedData} from "..";

export const disputeReducer = (
  protocolState: DisputeState,
  sharedData: SharedData,
  action: ProtocolAction
): ProtocolStateWithSharedData<DisputeState> => {
  if (!isChallengerAction(action) && !isResponderAction(action)) {
    return {protocolState, sharedData};
  }
  if (isTerminal(protocolState)) {
    return {protocolState, sharedData};
  }
  if (isNonTerminalResponderState(protocolState)) {
    return responderReducer(protocolState, sharedData, action);
  } else {
    const {state, sharedData: updatedSharedData} = challengerReducer(
      protocolState,
      sharedData,
      action
    );
    return {protocolState: state, sharedData: updatedSharedData};
  }
};
