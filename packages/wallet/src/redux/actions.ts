import * as channel from "./channel-store/actions";
import * as directFunding from "./protocols/direct-funding/actions";
import * as NewLedgerChannel from "./protocols/new-ledger-channel/actions";
import * as application from "./protocols/application/actions";
import * as protocol from "./protocols/actions";
import * as advanceChannel from "./protocols/advance-channel";
import {FundingAction, isFundingAction} from "./protocols/funding/actions";
import {CommitmentReceived, commitmentReceived, RelayableAction, ProtocolLocator} from "../communication";
import {TransactionAction as TA, isTransactionAction as isTA} from "./protocols/transaction-submission/actions";

import {ConcludingAction, isConcludingAction} from "./protocols/concluding";
import {ApplicationAction} from "./protocols/application/actions";
import {ActionConstructor} from "./utils";
import {Commitment} from "../domain";
import {isDefundingAction, DefundingAction} from "./protocols/defunding/actions";
import {AdvanceChannelAction} from "./protocols/advance-channel/actions";
import {FundingStrategyNegotiationAction} from "./protocols/funding-strategy-negotiation/actions";
import {LedgerFundingAction} from "./protocols/ledger-funding";

import {LOAD as LOAD_FROM_STORAGE} from "redux-storage";
export * from "./protocols/transaction-submission/actions";
export {CommitmentReceived, commitmentReceived};

export type TransactionAction = TA;
export const isTransactionAction = isTA;

export enum WalletActionType {
  BLOCK_MINED = "BLOCK_MINED",
  METAMASK_LOAD_ERROR = "METAMASK_LOAD_ERROR",
  WALLET_ADJUDICATOR_CHALLENGE_EXPIRY_TIME_SET = "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET",
  WALLET_ADJUDICATOR_CHALLENGE_CREATED_EVENT = "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT",
  WALLET_ADJUDICATOR_CONCLUDED_EVENT = "WALLET.ADJUDICATOR.CONCLUDED_EVENT",
  WALLET_ADJUDICATOR_FUNDING_RECEIVED_EVENT = "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT",
  WALLET_ADJUDICATOR_REFUTED_EVENT = "WALLET.ADJUDICATOR.REFUTED_EVENT",
  WALLET_ADJUDICATOR_RESPOND_WITH_MOVE_EVENT = "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT",
  WALLET_MULTIPLE_ACTIONS = "WALLET.MULTIPLE_ACTIONS",
  WALLET_LOGGED_IN = "WALLET.LOGGED_IN",
  WALLET_ADJUDICATOR_KNOWN = "WALLET.ADJUDICATOR_KNOWN",
  WALLET_MESSAGE_SENT = "WALLET.MESSAGE_SENT",
  WALLET_DISPLAY_MESSAGE_SENT = "WALLET.DISPLAY_MESSAGE_SENT"
}

// -------
// Actions
// -------

export interface MultipleWalletActions {
  type: WalletActionType.WALLET_MULTIPLE_ACTIONS;
  actions: WalletAction[];
}
export interface LoggedIn {
  type: WalletActionType.WALLET_LOGGED_IN;
  uid: string;
}

export interface AdjudicatorKnown {
  type: WalletActionType.WALLET_ADJUDICATOR_KNOWN;
  networkId: string;
  adjudicator: string;
}

export interface MessageSent {
  type: WalletActionType.WALLET_MESSAGE_SENT;
}

export interface DisplayMessageSent {
  type: WalletActionType.WALLET_DISPLAY_MESSAGE_SENT;
}

export interface BlockMined {
  type: WalletActionType.BLOCK_MINED;
  block: {timestamp: number; number: number};
}

export interface MetamaskLoadError {
  type: WalletActionType.METAMASK_LOAD_ERROR;
}

export type Message = "FundingDeclined";

export interface ChallengeExpirySetEvent {
  type: WalletActionType.WALLET_ADJUDICATOR_CHALLENGE_EXPIRY_TIME_SET;
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  expiryTime;
}

export interface ChallengeCreatedEvent {
  type: WalletActionType.WALLET_ADJUDICATOR_CHALLENGE_CREATED_EVENT;
  channelId: string;
  commitment: Commitment;
  finalizedAt: number;
}

export interface ConcludedEvent {
  channelId: string;
  type: WalletActionType.WALLET_ADJUDICATOR_CONCLUDED_EVENT;
}

export interface RefutedEvent {
  type: WalletActionType.WALLET_ADJUDICATOR_REFUTED_EVENT;
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  refuteCommitment: Commitment;
}

export interface RespondWithMoveEvent {
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  responseCommitment: Commitment;
  responseSignature: string;
  type: WalletActionType.WALLET_ADJUDICATOR_RESPOND_WITH_MOVE_EVENT;
}

export interface FundingReceivedEvent {
  type: WalletActionType.WALLET_ADJUDICATOR_FUNDING_RECEIVED_EVENT;
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  amount: string;
  totalForDestination: string;
}

export interface ChallengeExpiredEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  timestamp: number;
}

export interface ChannelUpdate {
  type: "WALLET.ADJUDICATOR.CHANNEL_UPDATE";
  channelId: string;
  isFinalized: boolean;
  balance: string;
}
// -------
// Constructors
// -------

export const multipleWalletActions: ActionConstructor<MultipleWalletActions> = p => ({
  ...p,
  type: WalletActionType.WALLET_MULTIPLE_ACTIONS
});

export const loggedIn: ActionConstructor<LoggedIn> = p => ({...p, type: WalletActionType.WALLET_LOGGED_IN});

export const adjudicatorKnown: ActionConstructor<AdjudicatorKnown> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_KNOWN
});

export const messageSent: ActionConstructor<MessageSent> = p => ({
  ...p,
  type: WalletActionType.WALLET_MESSAGE_SENT
});

export const displayMessageSent: ActionConstructor<DisplayMessageSent> = p => ({
  ...p,
  type: WalletActionType.WALLET_DISPLAY_MESSAGE_SENT
});

export const blockMined: ActionConstructor<BlockMined> = p => ({...p, type: WalletActionType.BLOCK_MINED});

export const metamaskLoadError: ActionConstructor<MetamaskLoadError> = p => ({
  ...p,
  type: WalletActionType.METAMASK_LOAD_ERROR
});

export const challengeExpirySetEvent: ActionConstructor<ChallengeExpirySetEvent> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_CHALLENGE_EXPIRY_TIME_SET
});

export const challengeCreatedEvent: ActionConstructor<ChallengeCreatedEvent> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_CHALLENGE_CREATED_EVENT
});

export const concludedEvent: ActionConstructor<ConcludedEvent> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_CONCLUDED_EVENT
});

export const refutedEvent: ActionConstructor<RefutedEvent> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_REFUTED_EVENT
});

export const respondWithMoveEvent: ActionConstructor<RespondWithMoveEvent> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_RESPOND_WITH_MOVE_EVENT
});
export const fundingReceivedEvent: ActionConstructor<FundingReceivedEvent> = p => ({
  ...p,
  type: WalletActionType.WALLET_ADJUDICATOR_FUNDING_RECEIVED_EVENT
});
export const challengeExpiredEvent: ActionConstructor<ChallengeExpiredEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED"
});
export const channelUpdate: ActionConstructor<ChannelUpdate> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHANNEL_UPDATE"
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
  | ChallengeExpirySetEvent
  | ChannelUpdate;

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
  | RelayableAction
  | FundingStrategyNegotiationAction
  | FundingAction
  | LedgerFundingAction;

export {channel, directFunding as funding, NewLedgerChannel, protocol, application, advanceChannel};

// These are any actions that update shared data directly without any protocol
export type SharedDataUpdateAction = AdjudicatorEventAction;

export function isSharedDataUpdateAction(action: WalletAction): action is SharedDataUpdateAction {
  return isAdjudicatorEventAction(action);
}

export function isAdjudicatorEventAction(action: WalletAction): action is AdjudicatorEventAction {
  return (
    action.type === WalletActionType.WALLET_ADJUDICATOR_CONCLUDED_EVENT ||
    action.type === WalletActionType.WALLET_ADJUDICATOR_REFUTED_EVENT ||
    action.type === WalletActionType.WALLET_ADJUDICATOR_RESPOND_WITH_MOVE_EVENT ||
    action.type === WalletActionType.WALLET_ADJUDICATOR_FUNDING_RECEIVED_EVENT ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED" ||
    action.type === WalletActionType.WALLET_ADJUDICATOR_CHALLENGE_CREATED_EVENT ||
    action.type === WalletActionType.WALLET_ADJUDICATOR_CHALLENGE_EXPIRY_TIME_SET ||
    action.type === "WALLET.ADJUDICATOR.CHANNEL_UPDATE"
  );
}

// These are actions related to storage
export interface LoadAction {
  type: typeof LOAD_FROM_STORAGE;
  payload: any;
}

export function isLoadAction(action: any): action is LoadAction {
  return action.type && action.type === LOAD_FROM_STORAGE;
}
