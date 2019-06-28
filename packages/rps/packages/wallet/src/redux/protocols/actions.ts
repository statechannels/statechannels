import { TwoPartyPlayerIndex } from '../types';
import { ActionConstructor } from '../utils';
import { ConcludeInstigated, WalletProtocol } from '../../communication';
import { WalletAction } from '../actions';
export { BaseProcessAction } from '../../communication';

// -------
// Actions
// -------
export interface InitializeChannel {
  type: 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL';
  protocol: WalletProtocol.Application;
  channelId: string;
}
export interface FundingRequested {
  type: 'WALLET.NEW_PROCESS.FUNDING_REQUESTED';
  channelId: string;
  playerIndex: TwoPartyPlayerIndex;
  protocol: WalletProtocol.Funding;
}

export interface ConcludeRequested {
  type: 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED';
  channelId: string;
  protocol: WalletProtocol.Concluding;
}

export interface DefundRequested {
  type: 'WALLET.NEW_PROCESS.DEFUND_REQUESTED';
  channelId: string;
  protocol: WalletProtocol.Defunding;
}
// -------
// Constructors
// -------
export const initializeChannel: ActionConstructor<InitializeChannel> = p => ({
  type: 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL',
  protocol: WalletProtocol.Application,
  ...p,
});

export const fundingRequested: ActionConstructor<FundingRequested> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.FUNDING_REQUESTED',
  protocol: WalletProtocol.Funding,
});

export const concludeRequested: ActionConstructor<ConcludeRequested> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED',
  protocol: WalletProtocol.Concluding,
});

export const defundRequested: ActionConstructor<DefundRequested> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.DEFUND_REQUESTED',
  protocol: WalletProtocol.Defunding,
});

// -------
// Types and Guards
// -------

export type NewProcessAction =
  | InitializeChannel
  | FundingRequested
  | ConcludeRequested
  | ConcludeInstigated
  | DefundRequested;

export function isNewProcessAction(action: WalletAction): action is NewProcessAction {
  return (
    action.type === 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL' ||
    action.type === 'WALLET.NEW_PROCESS.FUNDING_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.NEW_PROCESS.DEFUND_REQUESTED'
  );
}
