import { SignedCommitment } from '../domain';
import { WalletAction } from '../redux/actions';
import { FundingStrategy, ProtocolLocator, EmbeddedProtocol } from './index';
import { ProcessProtocol } from '.';
import { ActionConstructor } from '../redux/utils';
import { Commitments } from '../redux/channel-store';
import { CloseLedgerChannel } from '../redux/protocols/actions';

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
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED';
  strategy: FundingStrategy;
}

export interface StrategyApproved extends BaseProcessAction {
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED';
  strategy: FundingStrategy;
}
export interface ConcludeInstigated {
  type: 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED';
  protocol: ProcessProtocol.Concluding;
  channelId: string;
}

// -------
// Constructors
// -------

export const strategyProposed: ActionConstructor<StrategyProposed> = p => ({
  ...p,
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED',
});

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED',
});

export const concludeInstigated: ActionConstructor<ConcludeInstigated> = p => ({
  ...p,
  type: 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED',
  protocol: ProcessProtocol.Concluding,
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
  protocolLocator: ProtocolLocator;
}

export interface CommitmentsReceived extends BaseProcessAction {
  type: 'WALLET.COMMON.COMMITMENTS_RECEIVED';
  protocolLocator: ProtocolLocator;
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
  | CloseLedgerChannel
  | MultipleRelayableActions
  | ConcludeInstigated;

export function isRelayableAction(action: WalletAction): action is RelayableAction {
  return (
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED' ||
    action.type === 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED' ||
    action.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED' ||
    action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED' ||
    action.type === 'WALLET.NEW_PROCESS.CLOSE_LEDGER_CHANNEL' ||
    action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' ||
    action.type === 'WALLET.MULTIPLE_RELAYABLE_ACTIONS'
  );
}

export type CommonAction = CommitmentReceived | CommitmentsReceived;
export function isCommonAction(
  action: WalletAction,
  protocol?: EmbeddedProtocol,
): action is CommonAction {
  return (
    (action.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED' ||
      action.type === 'WALLET.COMMON.COMMITMENT_RECEIVED') &&
    // When passed a protocol, check that it's got the protocol in the protocol locator
    (!protocol || (action.protocolLocator && action.protocolLocator.indexOf(protocol) >= 0))
  );
}

export function routesToProtocol(
  action: WalletAction,
  protocolLocator: ProtocolLocator,
  descriptor: EmbeddedProtocol,
): boolean {
  if ('protocolLocator' in action) {
    return action.protocolLocator.indexOf(descriptor) === protocolLocator.length;
  } else {
    return true;
  }
}

export function routerFactory<T extends WalletAction>(
  typeGuard: (action: WalletAction) => action is T,
  protocol: EmbeddedProtocol,
): (action: WalletAction, protocolLocator: ProtocolLocator) => action is T {
  function router(action: WalletAction, protocolLocator: ProtocolLocator): action is T {
    return typeGuard(action) && routesToProtocol(action, protocolLocator, protocol);
  }

  return router;
}
