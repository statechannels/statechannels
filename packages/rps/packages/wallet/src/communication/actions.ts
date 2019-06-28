import { SignedCommitment } from '../domain';
import { WalletAction } from '../redux/actions';
import { FundingStrategy } from './index';
import { WalletProtocol } from '.';
import { ActionConstructor } from '../redux/utils';
import { Commitments } from '../redux/channel-store';
import { DefundRequested } from '../redux/protocols/actions';

export interface MultipleRelayableActions {
  type: 'WALLET.MULTIPLE_RELAYABLE_ACTIONS';
  actions: RelayableAction[];
}

export const multipleRelayableActions: ActionConstructor<MultipleRelayableActions> = p => ({
  ...p,
  type: 'WALLET.MULTIPLE_RELAYABLE_ACTIONS',
});

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

export interface KeepLedgerChannelApproved extends BaseProcessAction {
  type: 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED';
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

export const keepLedgerChannelApproved: ActionConstructor<KeepLedgerChannelApproved> = p => ({
  ...p,
  type: 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED',
});

// COMMON

// -------
// Actions
// -------

// Protocols should switch to CommitmentsReceived, as we will in general
// need to support n-party channels, and that is easiest to manage by
// sending a full round of commitments when possible ie. when not in PreFundSetup

export interface CommitmentReceived extends BaseProcessAction {
  type: 'WALLET.COMMON.COMMITMENT_RECEIVED';
  signedCommitment: SignedCommitment;
  protocolLocator?: string;
}

export interface CommitmentsReceived extends BaseProcessAction {
  type: 'WALLET.COMMON.COMMITMENTS_RECEIVED';
  protocolLocator: string;
  signedCommitments: Commitments;
}

// -------
// Constructors
// -------

export const commitmentReceived: ActionConstructor<CommitmentReceived> = p => ({
  ...p,
  type: 'WALLET.COMMON.COMMITMENT_RECEIVED',
});

export const commitmentsReceived: ActionConstructor<CommitmentsReceived> = p => ({
  ...p,
  type: 'WALLET.COMMON.COMMITMENTS_RECEIVED',
});

// -------
// Unions and Guards
// -------

export type RelayableAction =
  | StrategyProposed
  | StrategyApproved
  | ConcludeInstigated
  | CommitmentReceived
  | CommitmentsReceived
  | DefundRequested
  | KeepLedgerChannelApproved
  | MultipleRelayableActions;

export function isRelayableAction(action: WalletAction): action is RelayableAction {
  return (
    action.type === 'WALLET.FUNDING.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.FUNDING.STRATEGY_APPROVED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.NEW_PROCESS.DEFUND_REQUESTED' ||
    action.type === 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED' ||
    action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' ||
    action.type === 'WALLET.MULTIPLE_RELAYABLE_ACTIONS'
  );
}
