import { ProtocolState } from '..';
import { StateConstructor } from '../../utils';
import { DirectFundingState } from '../direct-funding/states';
import { AdvanceChannelState } from '../advance-channel';
import { ConsensusUpdateState } from '../consensus-update';

// -------
// States
// -------

export interface Success {
  type: 'NewLedgerFunding.Success';
}

export interface Failure {
  type: 'NewLedgerFunding.Failure';
}

export interface WaitForPreFundSetup {
  type: 'NewLedgerFunding.WaitForPreFundSetup';
  channelId: string;
  processId: string;
  preFundSetupState: AdvanceChannelState;
}

export interface WaitForDirectFunding {
  type: 'NewLedgerFunding.WaitForDirectFunding';
  channelId: string;
  ledgerId: string;
  processId: string;
  directFundingState: DirectFundingState;
  postFundSetupState: AdvanceChannelState;
}
export interface WaitForPostFundSetup {
  type: 'NewLedgerFunding.WaitForPostFundSetup';
  channelId: string;
  ledgerId: string;
  processId: string;
  postFundSetupState: AdvanceChannelState;
  consensusUpdateState: ConsensusUpdateState;
}
export interface WaitForLedgerUpdate {
  type: 'NewLedgerFunding.WaitForLedgerUpdate';
  channelId: string;
  ledgerId: string;
  processId: string;
  consensusUpdateState: ConsensusUpdateState;
}
// ------------
// Constructors
// ------------

export const success: StateConstructor<Success> = p => {
  return { type: 'NewLedgerFunding.Success' };
};

export const failure: StateConstructor<Failure> = p => {
  return { type: 'NewLedgerFunding.Failure' };
};
export const waitForPreFundSetup: StateConstructor<WaitForPreFundSetup> = p => {
  return { ...p, type: 'NewLedgerFunding.WaitForPreFundSetup' };
};

export const waitForDirectFunding: StateConstructor<WaitForDirectFunding> = p => {
  return {
    ...p,
    type: 'NewLedgerFunding.WaitForDirectFunding',
  };
};

export const waitForPostFundSetup: StateConstructor<WaitForPostFundSetup> = p => {
  return { ...p, type: 'NewLedgerFunding.WaitForPostFundSetup' };
};

export const waitForLedgerUpdate: StateConstructor<WaitForLedgerUpdate> = p => {
  return { ...p, type: 'NewLedgerFunding.WaitForLedgerUpdate' };
};

// -------
// Unions and Guards
// -------

export type NonTerminalNewLedgerFundingState =
  | WaitForPreFundSetup
  | WaitForDirectFunding
  | WaitForPostFundSetup
  | WaitForLedgerUpdate;

export type NewLedgerFundingState = NonTerminalNewLedgerFundingState | Success | Failure;
export type NewLedgerFundingStateType = NewLedgerFundingState['type'];

export function isNewLedgerFundingState(state: ProtocolState): state is NewLedgerFundingState {
  return (
    state.type === 'NewLedgerFunding.Failure' ||
    state.type === 'NewLedgerFunding.Success' ||
    state.type === 'NewLedgerFunding.WaitForDirectFunding' ||
    state.type === 'NewLedgerFunding.WaitForPostFundSetup' ||
    state.type === 'NewLedgerFunding.WaitForLedgerUpdate' ||
    state.type === 'NewLedgerFunding.WaitForPreFundSetup'
  );
}

export function isTerminal(state: NewLedgerFundingState): state is Failure | Success {
  return state.type === 'NewLedgerFunding.Failure' || state.type === 'NewLedgerFunding.Success';
}
