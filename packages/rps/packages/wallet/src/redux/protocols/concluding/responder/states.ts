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
  type: 'ResponderAcknowledgeSuccess';
  processId: string;
  channelId: string;
}
export interface ResponderAcknowledgeFailure {
  type: 'ResponderAcknowledgeFailure';
  reason: FailureReason;
  processId: string;
  channelId: string;
}
export interface ResponderApproveConcluding {
  type: 'ResponderApproveConcluding';
  processId: string;
  channelId: string;
}

export interface ResponderDecideDefund {
  type: 'ResponderDecideDefund';
  processId: string;
  channelId: string;
}

export interface ResponderWaitForDefund {
  type: 'ResponderWaitForDefund';
  processId: string;
  channelId: string;
  defundingState: DefundingState;
}

export function isConcludingResponderState(
  state: ProtocolState,
): state is ResponderConcludingState {
  return (
    state.type === 'ResponderAcknowledgeSuccess' ||
    state.type === 'ResponderAcknowledgeFailure' ||
    state.type === 'ResponderApproveConcluding' ||
    state.type === 'ResponderDecideDefund' ||
    state.type === 'ResponderWaitForDefund'
  );
}

// ------------
// Constructors
// ------------

export const responderApproveConcluding: Constructor<ResponderApproveConcluding> = p => {
  const { processId, channelId } = p;
  return { type: 'ResponderApproveConcluding', processId, channelId };
};

export const responderDecideDefund: Constructor<ResponderDecideDefund> = p => {
  const { processId, channelId } = p;
  return { type: 'ResponderDecideDefund', processId, channelId };
};

export const responderAcknowledgeSuccess: Constructor<ResponderAcknowledgeSuccess> = p => {
  const { processId, channelId } = p;
  return { type: 'ResponderAcknowledgeSuccess', processId, channelId };
};

export const responderAcknowledgeFailure: Constructor<ResponderAcknowledgeFailure> = p => {
  const { processId, channelId, reason } = p;
  return { type: 'ResponderAcknowledgeFailure', processId, channelId, reason };
};

export const responderWaitForDefund: Constructor<ResponderWaitForDefund> = p => {
  const { processId, channelId, defundingState } = p;
  return { type: 'ResponderWaitForDefund', processId, channelId, defundingState };
};
