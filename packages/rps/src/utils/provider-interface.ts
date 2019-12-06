import { Participant, Allocation, ChannelResult, Message } from './channel-client';

// Channel Provider Interface
// ==========================
export interface ChannelProviderInterface {
  enable(url?: string): Promise<void>;
  send<T extends Endpoints>(
    method: T['method'],
    params: T['request']['params']
  ): Promise<T['response']['result']>;
  subscribe(subscriptionType: string, params?: any[]): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
  on<T extends Notifications>(event: T['method'], callback: (a: T['params']) => void): void;
  off<T extends Notifications>(event: T['method'], callback: (a: T['params']) => void): void;
}

// Format: Endpoint<method, requestParams, responseParams, knownErrors>
type Endpoints =
  | Endpoint<'GetAddress', {}, { address: string }>
  | Endpoint<
      'CreateChannel',
      CreateChannelParameters,
      ChannelResult,
      Errors['InvalidAppDefinition' | 'UnsupportedToken' | 'SigningAddressNotFound']
    >
  | Endpoint<'JoinChannel', { channelId: string }, ChannelResult, Errors['ChannelNotFound']>
  | Endpoint<
      'UpdateChannel',
      UpdateChannelParameters,
      ChannelResult,
      Errors['ChannelNotFound' | 'InvalidStateTransition' | 'InvalidAppData']
    >
  | Endpoint<'CloseChannel', { channelId: string }, ChannelResult, Errors['ChannelNotFound']>
  | Endpoint<'PushMessage', Message, { success: boolean }, Errors['WrongParticipant']>;

// Errors
// todo: check the codes match
interface Errors {
  SigningAddressNotFound: JsonRpcError<1000>;
  InvalidAppDefinition: JsonRpcError<1001>;
  InvalidAppData: JsonRpcError<1002>;
  UnsupportedToken: JsonRpcError<1003>;
  ChannelNotFound: JsonRpcError<1004>;
  InvalidStateTransition: JsonRpcError<1005>;
  WrongParticipant: JsonRpcError<1006>;
}

type Notifications =
  | JsonRPCNotification<'ChannelProposed', ChannelResult>
  | JsonRPCNotification<'ChannelUpdated', ChannelResult>
  | JsonRPCNotification<'ChannelClosed', ChannelResult>
  | JsonRPCNotification<'MessageQueued', Message>;

// Utilities
// =========

interface Endpoint<
  Method,
  RequestParams,
  ResultParams,
  KnownErrors extends JsonRpcError = JsonRpcError
> {
  method: Method;
  request: JsonRpcRequest<Method, RequestParams>;
  response: JsonRpcResponse<ResultParams>;
  errors: KnownErrors | JsonRpcError<Exclude<number, KnownErrors['error']['code']>>;
}
// Json RPC stuff
// will be relevant when we build the non-fake channel client

export type JsonRPCVersion = '2.0';
export interface JsonRPCNotification<Name, ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: Name;
  params: ParametersType;
}

export interface JsonRpcRequest<Name, ParametersType> {
  jsonrpc: JsonRPCVersion;
  method: Name;
  params: ParametersType;
  id: string;
}

export interface JsonRpcResponse<ResultType> {
  jsonrpc: JsonRPCVersion;
  id: string;
  result: ResultType;
}

export interface JsonRpcError<Code = number, Data = any> {
  jsonrpc: JsonRPCVersion;
  id: string;
  error: {
    code: Code;
    message: string;
    data: Data;
  };
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
