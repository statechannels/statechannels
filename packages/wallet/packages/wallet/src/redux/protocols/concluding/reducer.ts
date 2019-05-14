import { ResponderNonTerminalState } from './responder/states';
import { InstigatorNonTerminalState, isConcludingInstigatorState } from './instigator/states';
import { SharedData } from '../../state';
import { ProtocolAction } from '../../actions';
import { ConcludingState } from './state';
import {
  instigatorConcludingReducer,
  initialize as initializeInstigator,
} from './instigator/reducer';
import { responderConcludingReducer, initialize as initializeResponder } from './responder/reducer';
import { ProtocolStateWithSharedData } from '..';
import { SignedCommitment } from '../../../domain';

export function concludingReducer(
  protocolState: ResponderNonTerminalState | InstigatorNonTerminalState,
  sharedData: SharedData,
  action: ProtocolAction,
): ProtocolStateWithSharedData<ConcludingState> {
  if (isConcludingInstigatorState(protocolState)) {
    const result = instigatorConcludingReducer(protocolState, sharedData, action);
    return { protocolState: result.protocolState, sharedData: result.sharedData };
  } else {
    const result = responderConcludingReducer(protocolState, sharedData, action);
    return { protocolState: result.protocolState, sharedData: result.sharedData };
  }
}

export function initializeInstigatorState(
  channelId: string,
  processId: string,
  sharedData: SharedData,
) {
  const result = initializeInstigator(channelId, processId, sharedData);
  return { protocolState: result.protocolState, sharedData: result.sharedData };
}

export function initializeResponderState(
  signedCommitment: SignedCommitment,
  processId: string,
  sharedData: SharedData,
) {
  const result = initializeResponder(signedCommitment, processId, sharedData);
  return { protocolState: result.protocolState, sharedData: result.sharedData };
}
