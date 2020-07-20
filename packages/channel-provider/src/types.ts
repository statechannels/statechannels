import {EventEmitter} from 'eventemitter3';
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
  GetStateResponse,
  GetStateRequest,
  GetWalletInformationRequest,
  GetWalletInformationResponse,
  EnableEthereumRequest,
  EnableEthereumResponse,
  ChallengeChannelResponse,
  ChallengeChannelRequest,
  GetBudgetResponse,
  GetBudgetRequest,
  ApproveBudgetAndFundResponse,
  ApproveBudgetAndFundRequest,
  NotificationType,
  GetChannelsRequest,
  GetChannelsResponse,
  ErrorResponse,
  CloseAndWithdrawRequest,
  CloseAndWithdrawResponse
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

export function isJsonRpcNotification<T>(message: any): message is JsonRpcNotification<T, any> {
  return 'method' in message && !('id' in message);
}

export type JsonRpcErrorResponse = ErrorResponse;

export function isJsonRpcErrorResponse(message: any): message is JsonRpcErrorResponse {
  return 'error' in message;
}

export type MethodType = {
  CreateChannel: {
    request: CreateChannelRequest;
    response: CreateChannelResponse;
  };
  UpdateChannel: {
    request: UpdateChannelRequest;
    response: UpdateChannelResponse;
  };
  PushMessage: {
    request: PushMessageRequest;
    response: PushMessageResponse;
  };
  CloseChannel: {
    request: CloseChannelRequest;
    response: CloseChannelResponse;
  };
  JoinChannel: {
    request: JoinChannelRequest;
    response: JoinChannelResponse;
  };
  GetState: {
    request: GetStateRequest;
    response: GetStateResponse;
  };
  GetWalletInformation: {
    request: GetWalletInformationRequest;
    response: GetWalletInformationResponse;
  };
  EnableEthereum: {
    request: EnableEthereumRequest;
    response: EnableEthereumResponse;
  };
  ChallengeChannel: {
    request: ChallengeChannelRequest;
    response: ChallengeChannelResponse;
  };
  ApproveBudgetAndFund: {
    request: ApproveBudgetAndFundRequest;
    response: ApproveBudgetAndFundResponse;
  };
  GetBudget: {
    request: GetBudgetRequest;
    response: GetBudgetResponse;
  };
  CloseAndWithdraw: {
    request: CloseAndWithdrawRequest;
    response: CloseAndWithdrawResponse;
  };
  GetChannels: {
    request: GetChannelsRequest;
    response: GetChannelsResponse;
  };
};

export type Method =
  | 'CreateChannel'
  | 'UpdateChannel'
  | 'PushMessage'
  | 'CloseChannel'
  | 'JoinChannel'
  | 'GetState'
  | 'GetWalletInformation'
  | 'EnableEthereum'
  | 'ChallengeChannel'
  | 'ApproveBudgetAndFund'
  | 'GetBudget'
  | 'CloseAndWithdraw'
  | 'GetChannels';

export interface EventType extends NotificationType {
  [id: string]: [unknown]; // guid
}
const eventEmitter = new EventEmitter<EventType>();
export type OnType = typeof eventEmitter.on;
export type OffType = typeof eventEmitter.off;

export interface ChannelProviderInterface {
  signingAddress?: string;
  destinationAddress?: string;
  walletVersion?: string;
  on: OnType;
  off: OffType;
  mountWalletComponent(url?: string): Promise<void>;
  enable(): Promise<void>;
  send<M extends Method = Method>(
    method: M,
    params: MethodType[M]['request']['params']
  ): Promise<MethodType[M]['response']['result']>;
  subscribe(subscriptionType: string, params?: any): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
}
