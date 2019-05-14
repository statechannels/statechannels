import { Constructor } from '../../../utils';
import { DefundingState } from '../../defunding';
export type InstigatorConcludingState =
  | InstigatorNonTerminalState
  | InstigatorPreTerminalState
  | TerminalState;
export type InstigatorConcludingStateType = InstigatorConcludingState['type'];
import { ProtocolState } from '../..';
import { FailureReason, TerminalState } from '../state';

export type InstigatorNonTerminalState =
  | InstigatorApproveConcluding
  | InstigatorWaitForOpponentConclude
  | InstigatorAcknowledgeConcludeReceived
  | InstigatorAcknowledgeFailure
  | InstigatorAcknowledgeSuccess
  | InstigatorWaitForDefund;

export type InstigatorPreTerminalState =
  | InstigatorAcknowledgeSuccess
  | InstigatorAcknowledgeFailure;

export interface InstigatorAcknowledgeSuccess {
  type: 'InstigatorAcknowledgeSuccess';
  processId: string;
  channelId: string;
}
export interface InstigatorAcknowledgeFailure {
  type: 'InstigatorAcknowledgeFailure';
  reason: FailureReason;
  processId: string;
  channelId: string;
}
export interface InstigatorApproveConcluding {
  type: 'InstigatorApproveConcluding';
  processId: string;
  channelId: string;
}

export interface InstigatorWaitForOpponentConclude {
  type: 'InstigatorWaitForOpponentConclude';
  processId: string;
  channelId: string;
}

export interface InstigatorAcknowledgeConcludeReceived {
  type: 'InstigatorAcknowledgeConcludeReceived';
  processId: string;
  channelId: string;
}

export interface InstigatorWaitForDefund {
  type: 'InstigatorWaitForDefund';
  processId: string;
  channelId: string;
  defundingState: DefundingState;
}

export function isConcludingInstigatorState(
  state: ProtocolState,
): state is InstigatorConcludingState {
  return (
    state.type === 'InstigatorAcknowledgeSuccess' ||
    state.type === 'InstigatorAcknowledgeFailure' ||
    state.type === 'InstigatorApproveConcluding' ||
    state.type === 'InstigatorWaitForOpponentConclude' ||
    state.type === 'InstigatorAcknowledgeConcludeReceived' ||
    state.type === 'InstigatorWaitForDefund'
  );
}

// ------------
// Constructors
// ------------

export const instigatorApproveConcluding: Constructor<InstigatorApproveConcluding> = p => {
  const { processId, channelId } = p;
  return { type: 'InstigatorApproveConcluding', processId, channelId };
};

export const instigatorWaitForOpponentConclude: Constructor<
  InstigatorWaitForOpponentConclude
> = p => {
  const { processId, channelId } = p;
  return { type: 'InstigatorWaitForOpponentConclude', processId, channelId };
};

export const instigatorAcknowledgeConcludeReceived: Constructor<
  InstigatorAcknowledgeConcludeReceived
> = p => {
  const { processId, channelId } = p;
  return { type: 'InstigatorAcknowledgeConcludeReceived', processId, channelId };
};

export const instigatorAcknowledgeSuccess: Constructor<InstigatorAcknowledgeSuccess> = p => {
  const { processId, channelId } = p;
  return { type: 'InstigatorAcknowledgeSuccess', processId, channelId };
};

export const instigatorAcknowledgeFailure: Constructor<InstigatorAcknowledgeFailure> = p => {
  const { processId, channelId, reason } = p;
  return { type: 'InstigatorAcknowledgeFailure', processId, channelId, reason };
};

export const instigatorWaitForDefund: Constructor<InstigatorWaitForDefund> = p => {
  const { processId, channelId, defundingState } = p;
  return { type: 'InstigatorWaitForDefund', processId, channelId, defundingState };
};
