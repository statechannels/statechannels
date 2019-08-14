import { ProtocolState } from '..';
import { StateConstructor } from '../../utils';
import { AdvanceChannelState } from '../advance-channel';
import { ConsensusUpdateState } from '../consensus-update';
import { NonTerminalIndirectFundingState } from '../indirect-funding';
import { ProtocolLocator } from '../../../communication';

// -------
// States
// -------

export interface InitializationArgs {
  processId: string;
  targetChannelId: string;
  startingAllocation: string[];
  startingDestination: string[];
  ourIndex: number;
  hubAddress: string;
  protocolLocator: ProtocolLocator;
}
type Base = InitializationArgs;

export interface WaitForJointChannel extends Base {
  type: 'VirtualFunding.WaitForJointChannel';
  jointChannel: AdvanceChannelState;
}

export interface WaitForGuarantorChannel extends Base {
  type: 'VirtualFunding.WaitForGuarantorChannel';
  guarantorChannel: AdvanceChannelState;
  jointChannelId: string;
}

export interface WaitForGuarantorFunding extends Base {
  type: 'VirtualFunding.WaitForGuarantorFunding';
  indirectGuarantorFunding: NonTerminalIndirectFundingState;
  indirectApplicationFunding: ConsensusUpdateState;
  jointChannelId: string;
}

export interface WaitForApplicationFunding extends Base {
  type: 'VirtualFunding.WaitForApplicationFunding';
  indirectApplicationFunding: ConsensusUpdateState;
  jointChannelId: string;
}

export interface Success {
  type: 'VirtualFunding.Success';
}

export interface Failure {
  type: 'VirtualFunding.Failure';
  reason?: string;
}

// ------------
// Constructors
// ------------

export const waitForJointChannel: StateConstructor<WaitForJointChannel> = p => {
  return { ...p, type: 'VirtualFunding.WaitForJointChannel' };
};
export const waitForGuarantorChannel: StateConstructor<WaitForGuarantorChannel> = p => {
  return { ...p, type: 'VirtualFunding.WaitForGuarantorChannel' };
};
export const waitForGuarantorFunding: StateConstructor<WaitForGuarantorFunding> = p => {
  return { ...p, type: 'VirtualFunding.WaitForGuarantorFunding' };
};
export const waitForApplicationFunding: StateConstructor<WaitForApplicationFunding> = p => {
  return { ...p, type: 'VirtualFunding.WaitForApplicationFunding' };
};

export const success: StateConstructor<Success> = _ => {
  return { type: 'VirtualFunding.Success' };
};

export const failure: StateConstructor<Failure> = _ => {
  return { type: 'VirtualFunding.Failure' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalVirtualFundingState =
  | WaitForJointChannel
  | WaitForGuarantorChannel
  | WaitForGuarantorFunding
  | WaitForApplicationFunding;

export type VirtualFundingState = NonTerminalVirtualFundingState | Success | Failure;
export type VirtualFundingStateType = VirtualFundingState['type'];

export function isVirtualFundingState(state: ProtocolState): state is VirtualFundingState {
  return (
    state.type === 'VirtualFunding.WaitForJointChannel' ||
    state.type === 'VirtualFunding.WaitForGuarantorChannel' ||
    state.type === 'VirtualFunding.WaitForGuarantorFunding' ||
    state.type === 'VirtualFunding.WaitForApplicationFunding' ||
    state.type === 'VirtualFunding.Failure' ||
    state.type === 'VirtualFunding.Success'
  );
}

export function isTerminal(state: VirtualFundingState): state is Failure | Success {
  return state.type === 'VirtualFunding.Failure' || state.type === 'VirtualFunding.Success';
}
