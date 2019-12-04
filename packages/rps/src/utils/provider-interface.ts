import { Participant, Allocation, ChannelResult, Message, ErrorCodes } from './channel-client';

interface X {
  a: 1;
  b: 2;
}

interface Y {
  a: 3;
  b: 4;
}

type XORY = X | Y;

function test<T extends XORY>(t: T['a']): T['b'] {
  return t === 1 ? 2 : 4;
}

interface GetAddressReqResp {
  methodName: 'getAddress';
  request: JsonRPCRequest<'GetAddress', {}>;
  response: string;
}

export interface IChannelProvider {
  enable(url?: string): Promise<void>;
  send<ResultType = any>(method: string, params?: any[]): Promise<ResultType>;
  subscribe(subscriptionType: string, params?: any[]): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
  on(event: string, callback: ListenerFn): void;
  off(event: string, callback?: ListenerFn): void;
}

// Json RPC stuff
// will be relevant when we build the non-fake channel client

export type JsonRPCVersion = '2.0';
export interface JsonRPCNotification<Name, ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: Name;
  params: ParametersType;
}

export interface JsonRPCRequest<Name, ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: Name;
  params: ParametersType;
  id: string;
}

export interface JsonRPCResponse<ResultType> {
  jsonrpc: JsonRPCVersion;
  id: string;
  result: ResultType;
}

export interface JsonRPCError {
  code: number;
  message: string;
  data?: { [key: string]: any };
}

export interface JsonRPCErrorResponse<ErrorType extends JsonRPCError = JsonRPCError> {
  jsonrpc: JsonRPCVersion;
  id: string;
  error: ErrorType;
}

interface CreateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: string;
  appData: string;
}

interface UpdateChannelParameters {
  channelId: string;
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

// Requests and Responses
// ======================

export type GetAddressRequest = JsonRPCRequest<'GetAddress', {}>; // todo: what are params

export type CreateChannelRequest = JsonRPCRequest<'CreateChannel', CreateChannelParameters>;

export interface CreateChannelResponse extends JsonRPCResponse<ChannelResult> {}

export interface JoinChannelParameters {
  channelId: string;
}

export type JoinChannelRequest = JsonRPCRequest<'JoinChannel', JoinChannelParameters>;

export interface JoinChannelResponse extends JsonRPCResponse<ChannelResult> {}

export type UpdateChannelRequest = JsonRPCRequest<'UpdateChannel', UpdateChannelParameters>;

export type PushMessageRequest = JsonRPCRequest<'PushMessage', Message>;

export interface PushMessageResult {
  success: boolean;
}

export type PushMessageResponse = JsonRPCResponse<PushMessageResult>;

export interface CloseChannelParameters {
  channelId: string;
}
export type CloseChannelRequest = JsonRPCRequest<'CloseChannel', CloseChannelParameters>;
export type CloseChannelResponse = JsonRPCResponse<ChannelResult>;

export type ChannelProposedNotification = JsonRPCNotification<'ChannelProposed', ChannelResult>;
export type ChannelUpdatedNotification = JsonRPCNotification<'ChannelUpdated', ChannelResult>;
export type ChannelClosingNotification = JsonRPCNotification<'ChannelClosed', ChannelResult>;

export type MessageQueuedNotification = JsonRPCNotification<'MessageQueued', Message>;

export type Notification =
  | ChannelProposedNotification
  | ChannelUpdatedNotification
  | ChannelClosingNotification
  | MessageQueuedNotification;

export type NotificationName = Notification['method'];

export type Request =
  | GetAddressRequest
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | PushMessageRequest
  | CloseChannelRequest;

export class ChannelClientError implements JsonRPCErrorResponse {
  jsonrpc: JsonRPCVersion = '2.0';

  error: JsonRPCError = {
    code: ErrorCodes.SIGNING_ADDRESS_NOT_FOUND,
    message: 'Something went wrong',
  };

  constructor(public readonly id: string) {}

  toJSON() {
    return {
      jsonrpc: this.jsonrpc,
      id: this.id,
      error: this.error,
    };
  }
}

export class SigningAddressNotFoundError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.SIGNING_ADDRESS_NOT_FOUND,
    message: 'Signing address not found',
  };
}

export class InvalidAppDefinitionError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.INVALID_APP_DEFINITION,
    message: 'Invalid app definition',
  };
}

export class InvalidAppDataError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.INVALID_APP_DATA,
    message: 'Invalid app data',
  };
}

export class UnsupportedTokenError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.UNSUPPORTED_TOKEN,
    message: 'Unsupported token',
  };
}

export class ChannelNotFoundError extends ChannelClientError {
  error: JsonRPCError = {
    code: ErrorCodes.CHANNEL_NOT_FOUND,
    message: 'Channel not found',
  };
}

export const ErrorCodesToObjectsMap: { [key in ErrorCodes]: typeof ChannelClientError } = {
  [ErrorCodes.CHANNEL_NOT_FOUND]: ChannelNotFoundError,
  [ErrorCodes.INVALID_APP_DATA]: InvalidAppDataError,
  [ErrorCodes.INVALID_APP_DEFINITION]: InvalidAppDefinitionError,
  [ErrorCodes.SIGNING_ADDRESS_NOT_FOUND]: SigningAddressNotFoundError,
  [ErrorCodes.UNSUPPORTED_TOKEN]: UnsupportedTokenError,
};
