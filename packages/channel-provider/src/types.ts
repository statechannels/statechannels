import {ListenerFn} from 'eventemitter3';

export type JsonRpcRequest = {
  id?: number;
  jsonrpc: '2.0';
  method: string;
  params: any;
};

export type JsonRpcResponse<ResultType = any> = {
  id: number;
  jsonrpc: '2.0';
  result: ResultType;
};

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

export type JsonRpcNotification = {
  jsonrpc: '2.0';
  method: string;
  params: any;
};

export function isJsonRpcNotification(message: any): message is JsonRpcNotification {
  return 'method' in message && !('id' in message);
}

export type JsonRpcErrorResponse = {
  id: number;
  jsonrpc: '2.0';
  error: JsonRpcError;
};

export function isJsonRpcErrorResponse(message: any): message is JsonRpcErrorResponse {
  return 'error' in message;
}

export interface IChannelProvider {
  enable(url?: string): Promise<void>;
  send<ResultType = any>(method: string, params?: any): Promise<ResultType>;
  on(event: string, callback: ListenerFn): void;
  off(event: string, callback?: ListenerFn): void;
  subscribe(subscriptionType: string, params?: any): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
}
