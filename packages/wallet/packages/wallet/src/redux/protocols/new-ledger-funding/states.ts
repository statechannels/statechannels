import { ProtocolState } from '..';
import { StateConstructor } from '../../utils';
import { DirectFundingState } from '../direct-funding/states';
import { AdvanceChannelState } from '../advance-channel';
import { ConsensusUpdateState } from '../consensus-update';
import { ProtocolLocator } from '../../../communication';

// -------
// States
// -------

export interface Success {
  type: 'NewLedgerFunding.Success';
}

export interface Failure {
  type: 'NewLedgerFunding.Failure';
}

interface Base {
  channelId: string;
  processId: string;
  protocolLocator: ProtocolLocator;
}

export interface WaitForPreFundSetup extends Base {
  type: 'NewLedgerFunding.WaitForPreFundSetup';
  preFundSetupState: AdvanceChannelState;
}

export interface WaitForDirectFunding extends Base {
  type: 'NewLedgerFunding.WaitForDirectFunding';
  ledgerId: string;
  directFundingState: DirectFundingState;
  postFundSetupState: AdvanceChannelState;
}
export interface WaitForPostFundSetup extends Base {
  type: 'NewLedgerFunding.WaitForPostFundSetup';
  ledgerId: string;
  postFundSetupState: AdvanceChannelState;
  consensusUpdateState: ConsensusUpdateState;
}
export interface WaitForLedgerUpdate extends Base {
  type: 'NewLedgerFunding.WaitForLedgerUpdate';
  ledgerId: string;
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

export function isSuccess(state: NewLedgerFundingState): state is Success {
  return state.type === 'NewLedgerFunding.Success';
}

export function isFailure(state: NewLedgerFundingState): state is Failure {
  return state.type === 'NewLedgerFunding.Failure';
}

export function isTerminal(state: NewLedgerFundingState): state is Failure | Success {
  return isSuccess(state) || isFailure(state);
}
