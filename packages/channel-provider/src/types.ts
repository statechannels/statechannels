import {ListenerFn} from 'eventemitter3';
import {
  Request as RequestParams,
  CreateChannelResponse,
  CreateChannelRequest,
  CloseChannelResponse,
  CloseChannelRequest,
  UpdateChannelResponse,
  UpdateChannelRequest,
  PushMessageResponse,
  PushMessageRequest,
  JoinChannelResponse,
  JoinChannelRequest,
  GetAddressResponse,
  GetAddressRequest,
  GetStateResponse,
  GetStateRequest,
  EnableEthereumRequest,
  EnableEthereumResponse,
  GetEthereumSelectedAddressResponse,
  GetEthereumSelectedAddressRequest,
  ChallengeChannelResponse,
  ChallengeChannelRequest,
  GetBudgetResponse,
  GetBudgetRequest,
  ApproveBudgetAndFundResponse,
  ApproveBudgetAndFundRequest
} from '@statechannels/client-api-schema';

export interface JsonRpcRequest<MethodName = string, RequestParams = any> {
  id?: number;
  jsonrpc: '2.0';
  method: MethodName;
  params: RequestParams;
}

export interface JsonRpcResponse<ResponseType = any> {
  id: number;
  jsonrpc: '2.0';
  result: ResponseType;
}

export function isJsonRpcResponse(message: any): message is JsonRpcResponse {
  return 'result' in message;
}

export type JsonRpcError = {
  code: number;
  message: string;
  data?: {
    [key: string]: any;
  };
};

export interface JsonRpcNotification<NotificationName = string, NotificationParams = any> {
  jsonrpc: '2.0';
  method: NotificationName;
  params: NotificationParams;
}

export function isJsonRpcNotification(message: any): message is JsonRpcNotification {
  return 'method' in message && !('id' in message);
}

export interface JsonRpcErrorResponse {
  id: number;
  jsonrpc: '2.0';
  error: JsonRpcError;
}

export function isJsonRpcErrorResponse(message: any): message is JsonRpcErrorResponse {
  return 'error' in message;
}

// TODO: This probably should live in client-api-schema?
export type MethodResponseType = {
  CreateChannel: CreateChannelResponse['result'];
  UpdateChannel: UpdateChannelResponse['result'];
  PushMessage: PushMessageResponse['result'];
  CloseChannel: CloseChannelResponse['result'];
  JoinChannel: JoinChannelResponse['result'];
  GetState: GetStateResponse['result'];
  EnableEthereum: EnableEthereumResponse['result'];
  GetAddress: GetAddressResponse['result'];
  GetEthereumSelectedAddress: GetEthereumSelectedAddressResponse['result'];
  ChallengeChannel: ChallengeChannelResponse['result'];
  ApproveBudgetAndFund: ApproveBudgetAndFundResponse['result'];
  GetBudget: GetBudgetResponse['result'];
  CloseAndWithdraw: any; // TODO: Add types
};

type Method =
  | 'CreateChannel'
  | 'UpdateChannel'
  | 'PushMessage'
  | 'CloseChannel'
  | 'JoinChannel'
  | 'GetState'
  | 'EnableEthereum'
  | 'GetAddress'
  | 'GetEthereumSelectedAddress'
  | 'ChallengeChannel'
  | 'ApproveBudgetAndFund'
  | 'GetBudget'
  | 'CloseAndWithdraw';

type Request = {params: RequestParams['params']}; // Replace with union type
type Call<K extends Method, T extends Request> = {
  method: K;
  params: T['params'];
};

export type MethodRequestType =
  | Call<'CreateChannel', CreateChannelRequest>
  | Call<'UpdateChannel', UpdateChannelRequest>
  | Call<'PushMessage', PushMessageRequest>
  | Call<'CloseChannel', CloseChannelRequest>
  | Call<'JoinChannel', JoinChannelRequest>
  | Call<'EnableEthereum', EnableEthereumRequest>
  | Call<'GetState', GetStateRequest>
  | Call<'GetAddress', GetAddressRequest>
  | Call<'GetEthereumSelectedAddress', GetEthereumSelectedAddressRequest>
  | Call<'ChallengeChannel', ChallengeChannelRequest>
  | Call<'ApproveBudgetAndFund', ApproveBudgetAndFundRequest>
  | Call<'GetBudget', GetBudgetRequest>
  | Call<'CloseAndWithdraw', any>;

export interface ChannelProviderInterface {
  enable(url?: string): Promise<void>;
  send(request: MethodRequestType): Promise<MethodResponseType[MethodRequestType['method']]>;
  on(event: string, callback: ListenerFn): void;
  off(event: string, callback?: ListenerFn): void;
  subscribe(subscriptionType: string, params?: any): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
}
