import { WalletProtocol } from '../types';
import { WalletAction } from '../actions';
import { ProcessAction as IndirectFundingProcessAction } from './indirect-funding/actions';

export interface NewProcessAction {
  protocol: WalletProtocol;
}

export function createsNewProcess(action: WalletAction): boolean {
  if ('protocol' in action) {
    if ('processId' in action) {
      throw new Error('Action cannot have both protocol and processId');
    }

    return true;
  }
  return false;
}

export interface BaseProcessAction {
  processId: string;
  type: string;
}

export type ProcessAction = IndirectFundingProcessAction;

export function routesToProcess(action: WalletAction): action is ProcessAction {
  return 'processId' in action;
}
