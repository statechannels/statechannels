import { SignedCommitment } from '../domain';
import { WalletAction } from '../redux/actions';
import { FundingStrategy } from './index';
import { WalletProtocol } from '.';
import { ActionConstructor } from '../redux/utils';

export interface BaseProcessAction {
  processId: string;
  type: string;
}

// FUNDING

// -------
// Actions
// -------
export interface StrategyProposed extends BaseProcessAction {
  type: 'WALLET.FUNDING.STRATEGY_PROPOSED';
  strategy: FundingStrategy;
}

export interface StrategyApproved extends BaseProcessAction {
  type: 'WALLET.FUNDING.STRATEGY_APPROVED';
}

export interface ConcludeInstigated {
  type: 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED';
  signedCommitment: SignedCommitment;
  protocol: WalletProtocol.Concluding;
  channelId: string;
}

// -------
// Constructors
// -------

export const strategyProposed: ActionConstructor<StrategyProposed> = p => ({
  ...p,
  type: 'WALLET.FUNDING.STRATEGY_PROPOSED',
});

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: 'WALLET.FUNDING.STRATEGY_APPROVED',
});

export const concludeInstigated: ActionConstructor<ConcludeInstigated> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED',
  protocol: WalletProtocol.Concluding,
});

// COMMON

// -------
// Actions
// -------

export interface CommitmentReceived extends BaseProcessAction {
  type: 'WALLET.COMMON.COMMITMENT_RECEIVED';
  signedCommitment: SignedCommitment;
}

// -------
// Constructors
// -------

export const commitmentReceived: ActionConstructor<CommitmentReceived> = p => ({
  ...p,
  type: 'WALLET.COMMON.COMMITMENT_RECEIVED',
});

// -------
// Unions and Guards
// -------

export type RelayableAction =
  | StrategyProposed
  | StrategyApproved
  | ConcludeInstigated
  | CommitmentReceived;

export function isRelayableAction(action: WalletAction): action is RelayableAction {
  return (
    action.type === 'WALLET.FUNDING.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.FUNDING.STRATEGY_APPROVED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED'
  );
}
