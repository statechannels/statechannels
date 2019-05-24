import { ProtocolAction, WalletAction } from '../actions';
import { PlayerIndex } from '../types';
import { Commitment } from '../../domain';
import { ActionConstructor } from '../utils';
import { ConcludeInstigated, WalletProtocol } from '../../communication';
export { BaseProcessAction } from '../../communication';

// -------
// Actions
// -------
export interface InitializeChannel {
  type: 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL';
  protocol: WalletProtocol.Application;
}
export interface FundingRequested {
  type: 'WALLET.NEW_PROCESS.FUNDING_REQUESTED';
  channelId: string;
  playerIndex: PlayerIndex;
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
// -------
// Constructors
// -------
export const initializeChannel: ActionConstructor<InitializeChannel> = p => ({
  type: 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL',
  protocol: WalletProtocol.Application,
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

// -------
// Types and Guards
// -------

export type NewProcessAction =
  | InitializeChannel
  | FundingRequested
  | ConcludeRequested
  | ConcludeInstigated
  | CreateChallengeRequested
  | ChallengeCreated;

export function isNewProcessAction(action: WalletAction): action is NewProcessAction {
  return (
    action.type === 'WALLET.NEW_PROCESS.INITIALIZE_CHANNEL' ||
    action.type === 'WALLET.NEW_PROCESS.FUNDING_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.NEW_PROCESS.CREATE_CHALLENGE_REQUESTED' ||
    action.type === 'WALLET.NEW_PROCESS.CHALLENGE_CREATED'
  );
}

export function isProtocolAction(action: WalletAction): action is ProtocolAction {
  return 'processId' in action;
}
