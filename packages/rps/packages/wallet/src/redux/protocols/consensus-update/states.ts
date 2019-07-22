import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';
import { ProtocolLocator } from '../../../communication';

export type NonTerminalConsensusUpdateState = NotSafeToSend | CommitmentSent;
export type ConsensusUpdateState = NonTerminalConsensusUpdateState | Failure | Success;
export type TerminalConsensusUpdateState = Failure | Success;
export type ConsensusUpdateStateType = ConsensusUpdateState['type'];

interface Base {
  proposedAllocation: string[];
  proposedDestination: string[];
  channelId: string;
  processId: string;
  protocolLocator: ProtocolLocator;
}

export interface NotSafeToSend extends Base {
  type: 'ConsensusUpdate.NotSafeToSend';
  clearedToSend: boolean;
}

export interface CommitmentSent extends Base {
  type: 'ConsensusUpdate.CommitmentSent';
}

export enum FailureReason {
  Error = 'Error',
  UnableToValidate = 'Unable to validate',
  InvalidTurnNumReceive = 'Invalid turn number received',
  ConsensusNotReached = 'Consensus not reached when in CommitmentSent',
  ProposalDoesNotMatch = 'Proposal does not match expected values.',
}
export interface Failure {
  type: 'ConsensusUpdate.Failure';
  reason: FailureReason;
  error?: string;
}

export interface Success {
  type: 'ConsensusUpdate.Success';
}

// -------
// Constructors
// -------

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'ConsensusUpdate.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { ...p, type: 'ConsensusUpdate.Failure' };
};

export const notSafeToSend: StateConstructor<NotSafeToSend> = p => {
  return { ...p, type: 'ConsensusUpdate.NotSafeToSend' };
};

export const commitmentSent: StateConstructor<CommitmentSent> = p => {
  return { ...p, type: 'ConsensusUpdate.CommitmentSent' };
};

export function isConsensusUpdateState(state: ProtocolState): state is ConsensusUpdateState {
  return (
    state.type === 'ConsensusUpdate.NotSafeToSend' ||
    state.type === 'ConsensusUpdate.CommitmentSent' ||
    isTerminal(state)
  );
}

export function isTerminal(state: ProtocolState): state is Failure | Success {
  return state.type === 'ConsensusUpdate.Failure' || state.type === 'ConsensusUpdate.Success';
}
