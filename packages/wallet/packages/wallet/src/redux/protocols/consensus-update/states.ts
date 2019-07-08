import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';

export type ConsensusUpdateState = WaitForUpdate | Failure | Success;
export type ConsensusUpdateStateType = ConsensusUpdateState['type'];

export interface WaitForUpdate {
  type: 'ConsensusUpdate.WaitForUpdate';
  proposedAllocation: string[];
  proposedDestination: string[];
  channelId: string;
  processId: string;
}

export interface Failure {
  type: 'ConsensusUpdate.Failure';
  reason: string;
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

export const waitForUpdate: StateConstructor<WaitForUpdate> = p => {
  return { ...p, type: 'ConsensusUpdate.WaitForUpdate' };
};

export function isConsensusUpdateState(state: ProtocolState): state is ConsensusUpdateState {
  return state.type === 'ConsensusUpdate.WaitForUpdate' || isTerminal(state);
}

export function isTerminal(state: ProtocolState): state is Failure | Success {
  return state.type === 'ConsensusUpdate.Failure' || state.type === 'ConsensusUpdate.Success';
}
