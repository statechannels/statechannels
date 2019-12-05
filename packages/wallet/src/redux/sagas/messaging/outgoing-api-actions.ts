import {ActionConstructor} from "../../utils";
import {RelayableAction} from "../../../communication";

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
