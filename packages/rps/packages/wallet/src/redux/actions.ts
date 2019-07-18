import * as channel from './channel-store/actions';
import * as directFunding from './protocols/direct-funding/actions';
import * as newLedgerFunding from './protocols/new-ledger-funding/actions';
import * as application from './protocols/application/actions';
import * as protocol from './protocols/actions';
import * as advanceChannel from './protocols/advance-channel';
import { FundingAction, isFundingAction } from './protocols/funding/actions';
import { CommitmentReceived, commitmentReceived, RelayableAction } from '../communication';
import {
  TransactionAction as TA,
  isTransactionAction as isTA,
} from './protocols/transaction-submission/actions';

import { ConcludingAction, isConcludingAction } from './protocols/concluding';
import { ApplicationAction } from './protocols/application/actions';
import { ActionConstructor } from './utils';
import { Commitment } from '../domain';
import { isDefundingAction, DefundingAction } from './protocols/defunding/actions';
import { AdvanceChannelAction } from './protocols/advance-channel/actions';

export * from './protocols/transaction-submission/actions';
export { CommitmentReceived, commitmentReceived };

export type TransactionAction = TA;
export const isTransactionAction = isTA;

// -------
// Actions
// -------

export interface MultipleWalletActions {
  type: 'WALLET.MULTIPLE_ACTIONS';
  actions: WalletAction[];
}
export interface LoggedIn {
  type: 'WALLET.LOGGED_IN';
  uid: string;
}

export interface AdjudicatorKnown {
  type: 'WALLET.ADJUDICATOR_KNOWN';
  networkId: string;
  adjudicator: string;
}

export interface MessageSent {
  type: 'WALLET.MESSAGE_SENT';
}

export interface DisplayMessageSent {
  type: 'WALLET.DISPLAY_MESSAGE_SENT';
}

export interface BlockMined {
  type: 'BLOCK_MINED';
  block: { timestamp: number; number: number };
}

export interface MetamaskLoadError {
  type: 'METAMASK_LOAD_ERROR';
}

export type Message = 'FundingDeclined';

export interface ChallengeExpirySetEvent {
  type: 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET';
  processId: string;
  channelId: string;
  expiryTime;
}

export interface ChallengeCreatedEvent {
  type: 'WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT';
  channelId: string;
  commitment: Commitment;
  finalizedAt: number;
}

export interface ConcludedEvent {
  channelId: string;
  type: 'WALLET.ADJUDICATOR.CONCLUDED_EVENT';
}

export interface RefutedEvent {
  type: 'WALLET.ADJUDICATOR.REFUTED_EVENT';
  processId: string;
  channelId: string;
  refuteCommitment: Commitment;
}

export interface RespondWithMoveEvent {
  processId: string;
  channelId: string;
  responseCommitment: Commitment;
  responseSignature: string;
  type: 'WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT';
}

export interface FundingReceivedEvent {
  type: 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT';
  processId: string;
  channelId: string;
  amount: string;
  totalForDestination: string;
}

export interface ChallengeExpiredEvent {
  type: 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED';
  processId: string;
  channelId: string;
  timestamp: number;
}

// -------
// Constructors
// -------

export const multipleWalletActions: ActionConstructor<MultipleWalletActions> = p => ({
  ...p,
  type: 'WALLET.MULTIPLE_ACTIONS',
});

export const loggedIn: ActionConstructor<LoggedIn> = p => ({ ...p, type: 'WALLET.LOGGED_IN' });

export const adjudicatorKnown: ActionConstructor<AdjudicatorKnown> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR_KNOWN',
});

export const messageSent: ActionConstructor<MessageSent> = p => ({
  ...p,
  type: 'WALLET.MESSAGE_SENT',
});

export const displayMessageSent: ActionConstructor<DisplayMessageSent> = p => ({
  ...p,
  type: 'WALLET.DISPLAY_MESSAGE_SENT',
});

export const blockMined: ActionConstructor<BlockMined> = p => ({ ...p, type: 'BLOCK_MINED' });

export const metamaskLoadError: ActionConstructor<MetamaskLoadError> = p => ({
  ...p,
  type: 'METAMASK_LOAD_ERROR',
});

export const challengeExpirySetEvent: ActionConstructor<ChallengeExpirySetEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET',
});

export const challengeCreatedEvent: ActionConstructor<ChallengeCreatedEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT',
});

export const concludedEvent: ActionConstructor<ConcludedEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.CONCLUDED_EVENT',
});

export const refutedEvent: ActionConstructor<RefutedEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.REFUTED_EVENT',
});

export const respondWithMoveEvent: ActionConstructor<RespondWithMoveEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT',
});
export const fundingReceivedEvent: ActionConstructor<FundingReceivedEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT',
});
export const challengeExpiredEvent: ActionConstructor<ChallengeExpiredEvent> = p => ({
  ...p,
  type: 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED',
});

// -------
// Unions and Guards
// -------

export type AdjudicatorEventAction =
  | ConcludedEvent
  | RefutedEvent
  | RespondWithMoveEvent
  | FundingReceivedEvent
  | ChallengeExpiredEvent
  | ChallengeCreatedEvent
  | ChallengeExpirySetEvent;

export type ProtocolAction =
  // only list top level protocol actions
  FundingAction | DefundingAction | ApplicationAction | ConcludingAction;

export function isProtocolAction(action: WalletAction): action is ProtocolAction {
  return (
    isFundingAction(action) ||
    application.isApplicationAction(action) ||
    isConcludingAction(action) ||
    isDefundingAction(action)
  );
}

export type WalletAction =
  | AdvanceChannelAction
  | AdjudicatorKnown
  | AdjudicatorEventAction
  | BlockMined
  | DisplayMessageSent
  | LoggedIn
  | MessageSent
  | MetamaskLoadError
  | ProtocolAction
  | protocol.NewProcessAction
  | channel.ChannelAction
  | RelayableAction;

export {
  channel,
  directFunding as funding,
  newLedgerFunding,
  protocol,
  application,
  advanceChannel,
};

// These are any actions that update shared data directly without any protocol
export type SharedDataUpdateAction = AdjudicatorEventAction;

export function isSharedDataUpdateAction(action: WalletAction): action is SharedDataUpdateAction {
  return isAdjudicatorEventAction(action);
}

export function isAdjudicatorEventAction(action: WalletAction): action is AdjudicatorEventAction {
  return (
    action.type === 'WALLET.ADJUDICATOR.CONCLUDED_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.REFUTED_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRED' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT' ||
    action.type === 'WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET'
  );
}
