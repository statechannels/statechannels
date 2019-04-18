import { WalletAction } from '../actions';
import {
  ProcessAction as IndirectFundingProcessAction,
  FUNDING_REQUESTED,
  FundingRequested,
} from './indirect-funding/actions';

// For the moment, the FundingRequested action is tied to the indirect funding
// protocol. It should change in the future to be a generic action, tied to the
// "Funding" protocol, and that protocol is responsible for choosing a funding strategy.
export type NewProcessAction = FundingRequested;

export function createsNewProcess(action: WalletAction): action is NewProcessAction {
  switch (action.type) {
    case FUNDING_REQUESTED:
      return true;
    default:
      return false;
  }
}

export interface BaseProcessAction {
  processId: string;
  type: string;
}

export type ProcessAction = IndirectFundingProcessAction;

export function routesToProcess(action: WalletAction): action is ProcessAction {
  return 'processId' in action;
}
