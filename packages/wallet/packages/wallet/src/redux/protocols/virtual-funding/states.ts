import { ProtocolState } from '..';
import { StateConstructor } from '../../utils';
import { AdvanceChannelState } from '../advance-channel';
import { ConsensusUpdateState } from '../consensus-update';

// -------
// States
// -------

interface Base {
  processId: string;
  targetChannelId: string;
  startingAllocation: string[];
  startingDestination: string[];
}
export const JOINT_CHANNEL_DESCRIPTOR = 'jointChannel';
export const GUARANTOR_CHANNEL_DESCRIPTOR = 'guarantorChannel';
export const INDIRECT_GUARANTOR_FUNDING_DESCRIPTOR = 'indirectGuarantorFunding';
export const INDIRECT_APPLICATION_FUNDING_DESCRIPTOR = 'indirectApplicationFunding';
export type SubstateDescriptor =
  | typeof JOINT_CHANNEL_DESCRIPTOR
  | typeof GUARANTOR_CHANNEL_DESCRIPTOR
  | typeof INDIRECT_GUARANTOR_FUNDING_DESCRIPTOR
  | typeof INDIRECT_APPLICATION_FUNDING_DESCRIPTOR;

export interface WaitForJointChannel extends Base {
  type: 'VirtualFunding.WaitForJointChannel';
  [JOINT_CHANNEL_DESCRIPTOR]: AdvanceChannelState;
}

export interface WaitForGuarantorChannel extends Base {
  type: 'VirtualFunding.WaitForGuarantorChannel';
  [GUARANTOR_CHANNEL_DESCRIPTOR]: AdvanceChannelState;
}

export interface WaitForGuarantorFunding extends Base {
  type: 'VirtualFunding.WaitForGuarantorFunding';
  [INDIRECT_GUARANTOR_FUNDING_DESCRIPTOR]: ConsensusUpdateState;
}

export interface WaitForApplicationFunding extends Base {
  type: 'VirtualFunding.WaitForApplicationFunding';
  [INDIRECT_APPLICATION_FUNDING_DESCRIPTOR]: ConsensusUpdateState;
}

export interface Success {
  type: 'VirtualFunding.Success';
}

export interface Failure {
  type: 'VirtualFunding.Failure';
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
