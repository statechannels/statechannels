import * as directFunding from "./protocols/direct-funding/actions";
import * as NewLedgerChannel from "./protocols/new-ledger-channel/actions";
import * as application from "./protocols/application/actions";
import * as protocol from "./protocols/actions";
import * as advanceChannel from "./protocols/advance-channel";
import {FundingAction, isFundingAction} from "./protocols/funding/actions";
import {RelayableAction, ProtocolLocator} from "../communication";

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
import {CloseLedgerChannelAction} from "./protocols/close-ledger-channel";
export * from "./protocols/transaction-submission/actions";

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
  assetHolderAddress: string;
  channelId: string;

  // NOTE: This is a parameter on the event, but it is not used in the wallet
  // This is either a `channelId` or an external destination (both bytes32).
  // destination: string;

  amount: BigNumber;
}

export interface DepositedEvent {
  type: "WALLET.ASSET_HOLDER.DEPOSITED";
  processId: string;
  protocolLocator: ProtocolLocator;
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
  expiryTime: number;
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

export const appDefinitionBytecodeReceived: ActionConstructor<AppDefinitionBytecodeReceived> = p => ({
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
  | LedgerFundingAction
  | CloseLedgerChannelAction;

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
