import { Constructor } from '../../../utils';
import { DefundingState } from '../../defunding';
export type ResponderConcludingState =
  | ResponderNonTerminalState
  | ResponderPreTerminalState
  | TerminalState;
export type ResponderConcludingStateType = ResponderConcludingState['type'];
import { ProtocolState } from '../..';
import { TerminalState, FailureReason } from '../state';

export type ResponderNonTerminalState =
  | ResponderApproveConcluding
  | ResponderDecideDefund
  | ResponderWaitForDefund
  | ResponderAcknowledgeFailure
  | ResponderAcknowledgeSuccess;

export type ResponderPreTerminalState = ResponderAcknowledgeSuccess | ResponderAcknowledgeFailure;

export interface ResponderAcknowledgeSuccess {
  type: 'ConcludingResponder.AcknowledgeSuccess';
  processId: string;
  channelId: string;
}
export interface ResponderAcknowledgeFailure {
  type: 'ConcludingResponder.AcknowledgeFailure';
  reason: FailureReason;
  processId: string;
  channelId: string;
}
export interface ResponderApproveConcluding {
  type: 'ConcludingResponder.ApproveConcluding';
  processId: string;
  channelId: string;
}

export interface ResponderDecideDefund {
  type: 'ConcludingResponder.DecideDefund';
  processId: string;
  channelId: string;
}

export interface ResponderWaitForDefund {
  type: 'ConcludingResponder.WaitForDefund';
  processId: string;
  channelId: string;
  defundingState: DefundingState;
}

export function isConcludingResponderState(
  state: ProtocolState,
): state is ResponderConcludingState {
  return (
    state.type === 'ConcludingResponder.AcknowledgeSuccess' ||
    state.type === 'ConcludingResponder.AcknowledgeFailure' ||
    state.type === 'ConcludingResponder.ApproveConcluding' ||
    state.type === 'ConcludingResponder.DecideDefund' ||
    state.type === 'ConcludingResponder.WaitForDefund'
  );
}

// ------------
// Constructors
// ------------

export const approveConcluding: Constructor<ResponderApproveConcluding> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingResponder.ApproveConcluding', processId, channelId };
};

export const decideDefund: Constructor<ResponderDecideDefund> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingResponder.DecideDefund', processId, channelId };
};

export const acknowledgeSuccess: Constructor<ResponderAcknowledgeSuccess> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingResponder.AcknowledgeSuccess', processId, channelId };
};

export const acknowledgeFailure: Constructor<ResponderAcknowledgeFailure> = p => {
  const { processId, channelId, reason } = p;
  return { type: 'ConcludingResponder.AcknowledgeFailure', processId, channelId, reason };
};

export const waitForDefund: Constructor<ResponderWaitForDefund> = p => {
  const { processId, channelId, defundingState } = p;
  return { type: 'ConcludingResponder.WaitForDefund', processId, channelId, defundingState };
};
