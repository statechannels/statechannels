import * as directFunding from "./protocols/direct-funding/actions";
import * as NewLedgerChannel from "./protocols/new-ledger-channel/actions";
import * as application from "./protocols/application/actions";
import * as protocol from "./protocols/actions";
import * as advanceChannel from "./protocols/advance-channel";
import {FundingAction, isFundingAction} from "./protocols/funding/actions";
import {RelayableAction, ProtocolLocator} from "../communication";
import {
  TransactionAction as TA,
  isTransactionAction as isTA
} from "./protocols/transaction-submission/actions";

import {ConcludingAction, isConcludingAction} from "./protocols/concluding";
import {ApplicationAction} from "./protocols/application/actions";
import {ActionConstructor} from "./utils";
import {isDefundingAction, DefundingAction} from "./protocols/defunding/actions";
import {AdvanceChannelAction} from "./protocols/advance-channel/actions";
import {FundingStrategyNegotiationAction} from "./protocols/funding-strategy-negotiation/actions";
import {LedgerFundingAction} from "./protocols/ledger-funding";

import {LOAD as LOAD_FROM_STORAGE} from "redux-storage";
import {SignedState, State} from "@statechannels/nitro-protocol";
import {BigNumber} from "ethers/utils";
export * from "./protocols/transaction-submission/actions";

export type TransactionAction = TA;
export const isTransactionAction = isTA;

// -------
// Actions
// -------

export interface MultipleWalletActions {
  type: "WALLET.MULTIPLE_ACTIONS";
  actions: WalletAction[];
}
export interface AdjudicatorKnown {
  type: "WALLET.ADJUDICATOR_KNOWN";
  networkId: string;
  adjudicator: string;
}

export interface AppDefinitionBytecodeReceived {
  type: "WALLET.APP_DEFINITION_BYTECODE_RECEIVED";
  appDefinition: string;
  bytecode: string;
}

export interface MessageSent {
  type: "WALLET.MESSAGE_SENT";
}

export interface DisplayMessageSent {
  type: "WALLET.DISPLAY_MESSAGE_SENT";
}

export interface AssetTransferredEvent {
  type: "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED";

  // This is either a `channelId` or an external destination (both bytes32).
  destination: string;
  amount: BigNumber;
}

export interface DepositedEvent {
  type: "WALLET.ASSET_HOLDER.DEPOSITED";
  assetHolderAddress: string;
  // This is either a `channelId` or an external destination (both bytes32).
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export interface BlockMined {
  type: "BLOCK_MINED";
  block: {timestamp: number; number: number};
}

export type Message = "FundingDeclined";

export interface ChallengeExpirySetEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  expiryTime;
}

export interface ChallengeCreatedEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT";
  channelId: string;

  finalizedAt: number;
  challengeStates: SignedState[];
}

export interface ChallengeClearedEvent {
  type: "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT";
  channelId: string;

  newTurnNumRecord: number;
}

export interface ConcludedEvent {
  channelId: string;
  type: "WALLET.ADJUDICATOR.CONCLUDED_EVENT";
}

export interface RefutedEvent {
  type: "WALLET.ADJUDICATOR.REFUTED_EVENT";
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  refuteState: State;
}

export interface RespondWithMoveEvent {
  processId: string;
  protocolLocator: ProtocolLocator;
  channelId: string;
  signedResponseState: SignedState;
  type: "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT";
}

export interface FundingReceivedEvent {
  type: "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT";
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
}
// -------
// Constructors
// -------

export const multipleWalletActions: ActionConstructor<MultipleWalletActions> = p => ({
  ...p,
  type: "WALLET.MULTIPLE_ACTIONS"
});

export const adjudicatorKnown: ActionConstructor<AdjudicatorKnown> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR_KNOWN"
});

export const appDefinitionBytecodeReceived: ActionConstructor<
  AppDefinitionBytecodeReceived
> = p => ({
  ...p,
  type: "WALLET.APP_DEFINITION_BYTECODE_RECEIVED"
});

export const messageSent: ActionConstructor<MessageSent> = p => ({
  ...p,
  type: "WALLET.MESSAGE_SENT"
});

export const displayMessageSent: ActionConstructor<DisplayMessageSent> = p => ({
  ...p,
  type: "WALLET.DISPLAY_MESSAGE_SENT"
});

export const depositedEvent: ActionConstructor<DepositedEvent> = p => ({
  ...p,
  type: "WALLET.ASSET_HOLDER.DEPOSITED"
});

export const assetTransferredEvent: ActionConstructor<AssetTransferredEvent> = p => ({
  ...p,
  type: "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED"
});

export const blockMined: ActionConstructor<BlockMined> = p => ({...p, type: "BLOCK_MINED"});

export const challengeExpirySetEvent: ActionConstructor<ChallengeExpirySetEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET"
});

export const challengeCreatedEvent: ActionConstructor<ChallengeCreatedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT"
});

export const challengeClearedEvent: ActionConstructor<ChallengeClearedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT"
});

export const concludedEvent: ActionConstructor<ConcludedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.CONCLUDED_EVENT"
});

export const refutedEvent: ActionConstructor<RefutedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.REFUTED_EVENT"
});

export const respondWithMoveEvent: ActionConstructor<RespondWithMoveEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT"
});
export const fundingReceivedEvent: ActionConstructor<FundingReceivedEvent> = p => ({
  ...p,
  type: "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT"
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
  | ChallengeExpiredEvent
  | ChallengeCreatedEvent
  | ChallengeClearedEvent
  | ChallengeExpirySetEvent
  | ChannelUpdate;

export type AssetHolderEventAction = AssetTransferredEvent | DepositedEvent;

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
  | AppDefinitionBytecodeReceived
  | AdjudicatorEventAction
  | AssetHolderEventAction
  | BlockMined
  | DisplayMessageSent
  | MessageSent
  | ProtocolAction
  | protocol.NewProcessAction
  | RelayableAction
  | FundingStrategyNegotiationAction
  | FundingAction
  | LedgerFundingAction;

export {directFunding as funding, NewLedgerChannel, protocol, application, advanceChannel};

// These are any actions that update shared data directly without any protocol
export type SharedDataUpdateAction =
  | AdjudicatorEventAction
  | AssetHolderEventAction
  | AppDefinitionBytecodeReceived;

export function isSharedDataUpdateAction(action: WalletAction): action is SharedDataUpdateAction {
  return (
    isAdjudicatorEventAction(action) ||
    isAssetHolderEventAction(action) ||
    action.type === "WALLET.APP_DEFINITION_BYTECODE_RECEIVED"
  );
}

export function isAdjudicatorEventAction(action: WalletAction): action is AdjudicatorEventAction {
  return (
    action.type === "WALLET.ADJUDICATOR.CONCLUDED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.REFUTED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.RESPOND_WITH_MOVE_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.FUNDING_RECEIVED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRED" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT" ||
    action.type === "WALLET.ADJUDICATOR.CHALLENGE_EXPIRY_TIME_SET" ||
    action.type === "WALLET.ADJUDICATOR.CHANNEL_UPDATE"
  );
}

export function isAssetHolderEventAction(action: WalletAction): action is AssetHolderEventAction {
  return (
    action.type === "WALLET.ASSET_HOLDER.DEPOSITED" ||
    action.type === "WALLET.ASSET_HOLDER.ASSET_TRANSFERRED"
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

export interface ApiAction {
  id: number | string; // Either a string or number is technically valid
  type: string;
}

export interface CreateChannelResponse extends ApiAction {
  type: "WALLET.CREATE_CHANNEL_RESPONSE";
  channelId: string;
}
export const createChannelResponse: ActionConstructor<CreateChannelResponse> = p => ({
  ...p,
  type: "WALLET.CREATE_CHANNEL_RESPONSE"
});

export interface UpdateChannelResponse extends ApiAction {
  type: "WALLET.UPDATE_CHANNEL_RESPONSE";
  channelId: string;
}
export const updateChannelResponse: ActionConstructor<UpdateChannelResponse> = p => ({
  ...p,
  type: "WALLET.UPDATE_CHANNEL_RESPONSE"
});

export interface AddressResponse extends ApiAction {
  type: "WALLET.ADDRESS_RESPONSE";
  address: string;
}
export const addressResponse: ActionConstructor<AddressResponse> = p => ({
  ...p,
  type: "WALLET.ADDRESS_RESPONSE"
});

export interface UnknownSigningAddress extends ApiAction {
  type: "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR";
  signingAddress: string;
}

export const unknownSigningAddress: ActionConstructor<UnknownSigningAddress> = p => ({
  ...p,
  type: "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR"
});

export interface UnknownChannelId extends ApiAction {
  type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR";
  channelId: string;
}

export const unknownChannelId: ActionConstructor<UnknownChannelId> = p => ({
  ...p,
  type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR"
});

export interface NoContractError extends ApiAction {
  address: string;
  type: "WALLET.NO_CONTRACT_ERROR";
}
export const noContractError: ActionConstructor<NoContractError> = p => ({
  ...p,
  type: "WALLET.NO_CONTRACT_ERROR"
});

export interface SendChannelProposedMessage {
  type: "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE";
  channelId: string;
  toParticipantId: string;
  fromParticipantId: string;
}

export const sendChannelProposedMessage: ActionConstructor<SendChannelProposedMessage> = p => ({
  ...p,
  type: "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE"
});

export interface SendChannelJoinedMessage {
  type: "WALLET.SEND_CHANNEL_JOINED_MESSAGE";
  channelId: string;
  toParticipantId: string;
  fromParticipantId: string;
}

export const sendChannelJoinedMessage: ActionConstructor<SendChannelJoinedMessage> = p => ({
  ...p,
  type: "WALLET.SEND_CHANNEL_JOINED_MESSAGE"
});

export interface ChannelProposedEvent {
  type: "WALLET.CHANNEL_PROPOSED_EVENT";
  channelId: string;
}

export const channelProposedEvent: ActionConstructor<ChannelProposedEvent> = p => ({
  ...p,
  type: "WALLET.CHANNEL_PROPOSED_EVENT"
});

export interface PostMessageResponse extends ApiAction {
  type: "WALLET.POST_MESSAGE_RESPONSE";
}

export const postMessageResponse: ActionConstructor<PostMessageResponse> = p => ({
  ...p,
  type: "WALLET.POST_MESSAGE_RESPONSE"
});

export interface JoinChannelResponse extends ApiAction {
  type: "WALLET.JOIN_CHANNEL_RESPONSE";
  channelId: string;
}
export const joinChannelResponse: ActionConstructor<JoinChannelResponse> = p => ({
  ...p,
  type: "WALLET.JOIN_CHANNEL_RESPONSE"
});

export interface ValidationError extends ApiAction {
  type: "WALLET.VALIDATION_ERROR";
}
export const validationError: ActionConstructor<ValidationError> = p => ({
  ...p,
  type: "WALLET.VALIDATION_ERROR"
});

export interface RelayActionWithMessage {
  type: "WALLET.RELAY_ACTION_WITH_MESSAGE";
  toParticipantId: string;
  fromParticipantId: string;
  actionToRelay: RelayableAction;
}

export const relayActionWithMessage: ActionConstructor<RelayActionWithMessage> = p => ({
  ...p,

  type: "WALLET.RELAY_ACTION_WITH_MESSAGE"
});

// This is used when a protocol expects to send a message
// but the json-rpc API has not been implemented yet
export interface ApiNotImplemented {
  type: "WALLET.API_NOT_IMPLEMENTED";
  apiMethod: string;
}
export const apiNotImplemented: ActionConstructor<ApiNotImplemented> = p => ({
  ...p,
  type: "WALLET.API_NOT_IMPLEMENTED"
});

export type OutgoingApiAction =
  | AddressResponse
  | CreateChannelResponse
  | UpdateChannelResponse
  | UnknownSigningAddress
  | NoContractError
  | SendChannelProposedMessage
  | SendChannelJoinedMessage
  | ChannelProposedEvent
  | PostMessageResponse
  | UnknownChannelId
  | NoContractError
  | JoinChannelResponse
  | ValidationError
  | RelayActionWithMessage
  | ApiNotImplemented;
