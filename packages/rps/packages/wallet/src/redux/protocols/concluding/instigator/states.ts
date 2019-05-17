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
  | ApproveConcluding
  | WaitForOpponentConclude
  | AcknowledgeConcludeReceived
  | AcknowledgeFailure
  | AcknowledgeSuccess
  | WaitForDefund;

export type InstigatorPreTerminalState = AcknowledgeSuccess | AcknowledgeFailure;

export interface AcknowledgeSuccess {
  type: 'ConcludingInstigator.AcknowledgeSuccess';
  processId: string;
  channelId: string;
}
export interface AcknowledgeFailure {
  type: 'ConcludingInstigator.AcknowledgeFailure';
  reason: FailureReason;
  processId: string;
  channelId: string;
}
export interface ApproveConcluding {
  type: 'ConcludingInstigator.ApproveConcluding';
  processId: string;
  channelId: string;
}

export interface WaitForOpponentConclude {
  type: 'ConcludingInstigator.WaitForOpponentConclude';
  processId: string;
  channelId: string;
}

export interface AcknowledgeConcludeReceived {
  type: 'ConcludingInstigator.AcknowledgeConcludeReceived';
  processId: string;
  channelId: string;
}

export interface WaitForDefund {
  type: 'ConcludingInstigator.WaitForDefund';
  processId: string;
  channelId: string;
  defundingState: DefundingState;
}

export function isConcludingInstigatorState(
  state: ProtocolState,
): state is InstigatorConcludingState {
  return (
    state.type === 'ConcludingInstigator.AcknowledgeSuccess' ||
    state.type === 'ConcludingInstigator.AcknowledgeFailure' ||
    state.type === 'ConcludingInstigator.ApproveConcluding' ||
    state.type === 'ConcludingInstigator.WaitForOpponentConclude' ||
    state.type === 'ConcludingInstigator.AcknowledgeConcludeReceived' ||
    state.type === 'ConcludingInstigator.WaitForDefund'
  );
}

// ------------
// Constructors
// ------------

export const instigatorApproveConcluding: Constructor<ApproveConcluding> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingInstigator.ApproveConcluding', processId, channelId };
};

export const instigatorWaitForOpponentConclude: Constructor<WaitForOpponentConclude> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingInstigator.WaitForOpponentConclude', processId, channelId };
};

export const instigatorAcknowledgeConcludeReceived: Constructor<
  AcknowledgeConcludeReceived
> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingInstigator.AcknowledgeConcludeReceived', processId, channelId };
};

export const instigatorAcknowledgeSuccess: Constructor<AcknowledgeSuccess> = p => {
  const { processId, channelId } = p;
  return { type: 'ConcludingInstigator.AcknowledgeSuccess', processId, channelId };
};

export const instigatorAcknowledgeFailure: Constructor<AcknowledgeFailure> = p => {
  const { processId, channelId, reason } = p;
  return { type: 'ConcludingInstigator.AcknowledgeFailure', processId, channelId, reason };
};

export const instigatorWaitForDefund: Constructor<WaitForDefund> = p => {
  const { processId, channelId, defundingState } = p;
  return { type: 'ConcludingInstigator.WaitForDefund', processId, channelId, defundingState };
};
