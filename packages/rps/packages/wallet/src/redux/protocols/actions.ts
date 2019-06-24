import { TwoPartyPlayerIndex } from '../types';
import { Commitment } from '../../domain';
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

export interface CreateChallengeRequested {
  type: 'WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED';
  channelId: string;
  commitment: Commitment;
  protocol: WalletProtocol.Dispute;
}

export interface ChallengeCreated {
  type: 'WALLET.NEW_PROCESS.CHALLENGE_CREATED';
  commitment: Commitment;
  expiresAt: number;
  channelId: string;
  protocol: WalletProtocol.Dispute;
}

export interface DefundRequested {
  type: 'WALLET.NEW_PROCESS.DEFUND_REQUESTED';
  processId: string; // to allow existing protocol reducer to terminate by consuming this action
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

export const createChallengeRequested: ActionConstructor<CreateChallengeRequested> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED',
  protocol: WalletProtocol.Dispute,
});

export const challengeCreated: ActionConstructor<ChallengeCreated> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.CHALLENGE_CREATED',
  protocol: WalletProtocol.Dispute,
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
  | CreateChallengeRequested
  | ChallengeCreated
  | DefundRequested;

export function isNewProcessAction(action: WalletAction): action is NewProcessAction {
  return (
    action.type === 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL' ||
    action.type === 'WALLET.NEW_PROCESS.FUNDING_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CHALLENGE_CREATED' ||
    action.type === 'WALLET.NEW_PROCESS.DEFUND_REQUESTED'
  );
}
