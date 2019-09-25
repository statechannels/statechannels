import { ProtocolLocator } from '../../../communication';
import { ConsensusUpdateState } from '../consensus-update';
import { StateConstructor } from '../../utils';
import { ProtocolState } from '..';

interface Base {
  processId: string;
  ourIndex: number;
  hubAddress: string;
  protocolLocator: ProtocolLocator;
  jointChannelId: string;
  targetChannelId: string;
  ledgerChannelId: string;
}

export interface WaitForJointChannelUpdate extends Base {
  type: 'VirtualDefunding.WaitForJointChannelUpdate';
  jointChannel: ConsensusUpdateState;
}
export interface WaitForLedgerChannelUpdate extends Base {
  type: 'VirtualDefunding.WaitForLedgerChannelUpdate';
  ledgerChannel: ConsensusUpdateState;
}

export interface Success {
  type: 'VirtualDefunding.Success';
}

export interface Failure {
  type: 'VirtualDefunding.Failure';
}

export const waitForJointChannelUpdate: StateConstructor<WaitForJointChannelUpdate> = p => {
  return { ...p, type: 'VirtualDefunding.WaitForJointChannelUpdate' };
};
export const waitForLedgerChannelUpdate: StateConstructor<WaitForLedgerChannelUpdate> = p => {
  return { ...p, type: 'VirtualDefunding.WaitForLedgerChannelUpdate' };
};

export const success: StateConstructor<Success> = _ => {
  return { type: 'VirtualDefunding.Success' };
};

export const failure: StateConstructor<Failure> = _ => {
  return { type: 'VirtualDefunding.Failure' };
};

export type NonTerminalVirtualDefundingState =
  | WaitForJointChannelUpdate
  | WaitForLedgerChannelUpdate;

export type TerminalVirtualDefundingState = Success | Failure;
export type VirtualDefundingState =
  | TerminalVirtualDefundingState
  | NonTerminalVirtualDefundingState;
export type VirtualDefundingStateType = VirtualDefundingState['type'];

export function isVirtualDefundingState(state: ProtocolState): state is VirtualDefundingState {
  return state.type.indexOf('VirtualDefunding') === 0;
}

export function isTerminal(state: VirtualDefundingState): state is Failure | Success {
  return state.type === 'VirtualDefunding.Failure' || state.type === 'VirtualDefunding.Success';
}
