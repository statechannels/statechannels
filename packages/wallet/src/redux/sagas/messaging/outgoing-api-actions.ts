import {ActionConstructor} from "../../utils";
import {RelayableAction} from "../../../communication";

export interface ApiResponseAction {
  id: number | string; // Either a string or number is technically valid
  type: string;
}
export interface ApiMessageNotificationAction {
  type: string;
  toParticipantId: string;
  fromParticipantId: string;
}

export interface CreateChannelResponse extends ApiResponseAction {
  type: "WALLET.CREATE_CHANNEL_RESPONSE";
  channelId: string;
}
export const createChannelResponse: ActionConstructor<CreateChannelResponse> = p => ({
  ...p,
  type: "WALLET.CREATE_CHANNEL_RESPONSE"
});

export interface UpdateChannelResponse extends ApiResponseAction {
  type: "WALLET.UPDATE_CHANNEL_RESPONSE";
  channelId: string;
}
export const updateChannelResponse: ActionConstructor<UpdateChannelResponse> = p => ({
  ...p,
  type: "WALLET.UPDATE_CHANNEL_RESPONSE"
});
export interface ChallengeChannelResponse extends ApiResponseAction {
  type: "WALLET.CHALLENGE_CHANNEL_RESPONSE";
  channelId: string;
}
export const challengeChannelResponse: ActionConstructor<ChallengeChannelResponse> = p => ({
  ...p,
  type: "WALLET.CHALLENGE_CHANNEL_RESPONSE"
});

export interface AddressResponse extends ApiResponseAction {
  type: "WALLET.ADDRESS_RESPONSE";
  address: string;
}
export const addressResponse: ActionConstructor<AddressResponse> = p => ({
  ...p,
  type: "WALLET.ADDRESS_RESPONSE"
});

export interface UnknownSigningAddress extends ApiResponseAction {
  type: "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR";
  signingAddress: string;
}

export const unknownSigningAddress: ActionConstructor<UnknownSigningAddress> = p => ({
  ...p,
  type: "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR"
});

export interface UnknownChannelId extends ApiResponseAction {
  type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR";
  channelId: string;
}

export const unknownChannelId: ActionConstructor<UnknownChannelId> = p => ({
  ...p,
  type: "WALLET.UNKNOWN_CHANNEL_ID_ERROR"
});

export interface NoContractError extends ApiResponseAction {
  address: string;
  type: "WALLET.NO_CONTRACT_ERROR";
}
export const noContractError: ActionConstructor<NoContractError> = p => ({
  ...p,
  type: "WALLET.NO_CONTRACT_ERROR"
});

export interface SendChannelProposedMessage extends ApiMessageNotificationAction {
  type: "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE";
  channelId: string;
}

export const sendChannelProposedMessage: ActionConstructor<SendChannelProposedMessage> = p => ({
  ...p,
  type: "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE"
});

export interface SendChannelJoinedMessage extends ApiMessageNotificationAction {
  type: "WALLET.SEND_CHANNEL_JOINED_MESSAGE";
  channelId: string;
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

export interface PushMessageResponse extends ApiResponseAction {
  type: "WALLET.PUSH_MESSAGE_RESPONSE";
}

export const pushMessageResponse: ActionConstructor<PushMessageResponse> = p => ({
  ...p,
  type: "WALLET.PUSH_MESSAGE_RESPONSE"
});

export interface JoinChannelResponse extends ApiResponseAction {
  type: "WALLET.JOIN_CHANNEL_RESPONSE";
  channelId: string;
}
export const joinChannelResponse: ActionConstructor<JoinChannelResponse> = p => ({
  ...p,
  type: "WALLET.JOIN_CHANNEL_RESPONSE"
});

export interface ValidationError extends ApiResponseAction {
  type: "WALLET.VALIDATION_ERROR";
}
export const validationError: ActionConstructor<ValidationError> = p => ({
  ...p,
  type: "WALLET.VALIDATION_ERROR"
});

export interface RelayActionWithMessage extends ApiMessageNotificationAction {
  type: "WALLET.RELAY_ACTION_WITH_MESSAGE";
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

export interface SendChannelUpdatedMessage extends ApiMessageNotificationAction {
  type: "WALLET.SEND_CHANNEL_UPDATED_MESSAGE";
  channelId: string;
}

export const sendChannelUpdatedMessage: ActionConstructor<SendChannelUpdatedMessage> = p => ({
  ...p,
  type: "WALLET.SEND_CHANNEL_UPDATED_MESSAGE"
});

export interface ChannelUpdatedEvent {
  type: "WALLET.CHANNEL_UPDATED_EVENT";
  channelId: string;
}
export const channelUpdatedEvent: ActionConstructor<ChannelUpdatedEvent> = p => ({
  ...p,
  type: "WALLET.CHANNEL_UPDATED_EVENT"
});

export interface CloseChannelResponse extends ApiResponseAction {
  type: "WALLET.CLOSE_CHANNEL_RESPONSE";
  channelId: string;
}

export const closeChannelResponse: ActionConstructor<CloseChannelResponse> = p => ({
  ...p,
  type: "WALLET.CLOSE_CHANNEL_RESPONSE"
});

export type OutgoingApiAction =
  | AddressResponse
  | CreateChannelResponse
  | UpdateChannelResponse
  | ChallengeChannelResponse
  | UnknownSigningAddress
  | NoContractError
  | SendChannelProposedMessage
  | SendChannelJoinedMessage
  | ChannelProposedEvent
  | PushMessageResponse
  | UnknownChannelId
  | NoContractError
  | JoinChannelResponse
  | ValidationError
  | RelayActionWithMessage
  | ApiNotImplemented
  | SendChannelUpdatedMessage
  | ChannelUpdatedEvent
  | CloseChannelResponse;
