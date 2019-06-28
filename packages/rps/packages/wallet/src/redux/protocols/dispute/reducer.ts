import { SharedData } from '../../state';
import { Commitment } from '../../../domain';
import { ProtocolStateWithSharedData } from '..';
import { DisputeState, isTerminal } from './state';
import { initialize as responderInitialize, responderReducer } from './responder/reducer';
import { initialize as challengerInitialize, challengerReducer } from './challenger/reducer';
import { isNonTerminalResponderState } from './responder/states';
import { isResponderAction } from './responder/actions';
import { ProtocolAction } from '../../actions';
import { isChallengerAction } from './challenger/actions';

export const initializeResponderState = (
  processId: string,
  channelId: string,
  expiryTime: number,
  sharedData: SharedData,
  challengeCommitment: Commitment,
): ProtocolStateWithSharedData<DisputeState> => {
  return responderInitialize(processId, channelId, expiryTime, sharedData, challengeCommitment);
};

export const initializeChallengerState = (
  processId: string,
  channelId: string,
  sharedData: SharedData,
): ProtocolStateWithSharedData<DisputeState> => {
  const { sharedData: updatedSharedData, state: protocolState } = challengerInitialize(
    processId,
    channelId,
    sharedData,
  );
  return { protocolState, sharedData: updatedSharedData };
};

export const disputeReducer = (
  protocolState: DisputeState,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<DisputeState> => {
  if (!isChallengerAction(action) && !isResponderAction(action)) {
    return { protocolState, sharedData };
  }
  if (isTerminal(protocolState)) {
    return { protocolState, sharedData };
  }
  if (isNonTerminalResponderState(protocolState)) {
    return responderReducer(protocolState, sharedData, action);
  } else {
    const { state, sharedData: updatedSharedData } = challengerReducer(
      protocolState,
      sharedData,
      action,
    );
    return { protocolState: state, sharedData: updatedSharedData };
  }
};
