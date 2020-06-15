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
  ErrorResponse
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

// TODO: This probably should live in client-api-schema?
export type MethodResponseType = {
  CreateChannel: CreateChannelResponse['result'];
  UpdateChannel: UpdateChannelResponse['result'];
  PushMessage: PushMessageResponse['result'];
  CloseChannel: CloseChannelResponse['result'];
  JoinChannel: JoinChannelResponse['result'];
  GetState: GetStateResponse['result'];
  GetWalletInformation: GetWalletInformationResponse['result'];
  EnableEthereum: EnableEthereumResponse['result'];
  ChallengeChannel: ChallengeChannelResponse['result'];
  ApproveBudgetAndFund: ApproveBudgetAndFundResponse['result'];
  GetBudget: GetBudgetResponse['result'];
  CloseAndWithdraw: any; // TODO: Add types
  GetChannels: GetChannelsResponse['result'];
};

type Method =
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
  | Call<'GetWalletInformation', GetWalletInformationRequest>
  | Call<'EnableEthereum', EnableEthereumRequest>
  | Call<'GetState', GetStateRequest>
  | Call<'ChallengeChannel', ChallengeChannelRequest>
  | Call<'ApproveBudgetAndFund', ApproveBudgetAndFundRequest>
  | Call<'GetBudget', GetBudgetRequest>
  | Call<'CloseAndWithdraw', any>
  | Call<'GetChannels', GetChannelsRequest>;

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
  send(request: MethodRequestType): Promise<MethodResponseType[MethodRequestType['method']]>;
  subscribe(subscriptionType: string, params?: any): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
}
