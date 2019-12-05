import {ListenerFn} from 'eventemitter3';

export type JsonRpcRequest = {
  id?: number;
  jsonrpc: '2.0';
  method: string;
  params: object;
};

export type JsonRpcResponse<ResultType = any> = {
  id: number;
  jsonrpc: '2.0';
  result: ResultType;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: {
    [key: string]: any;
  };
};

export type JsonRpcErrorResponse = {
  id: number;
  jsonrpc: '2.0';
  error: JsonRpcError;
};

export interface IChannelProvider {
  enable(url?: string): Promise<void>;
  send<ResultType = any>(method: string, params?: object): Promise<ResultType>;
  subscribe(subscriptionType: string, params?: object): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
  on(event: string, callback: ListenerFn): void;
  off(event: string, callback?: ListenerFn): void;
}

export enum ChannelProviderUIMessage {
  Close = 'ui:wallet:close',
  Acknowledge = 'ui:wallet:ack'
}

export type JsonRpcSubscribeResult = {subscription: string};
export type JsonRpcUnsubscribeResult = {success: boolean};
