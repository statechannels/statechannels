import {ListenerFn} from 'eventemitter3';
import {JsonRPCRequest} from 'web3/providers';

export interface IChannelProvider {
  enable(url?: string): Promise<void>;
  send<ResultType = any>(method: string, params?: any[]): Promise<ResultType>;
  subscribe(subscriptionType: string, params?: any[]): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
  on(event: string, callback: ListenerFn): void;
  off(event: string, callback?: ListenerFn): void;
}

export enum ChannelProviderUIMessage {
  Close = 'ui:wallet:close',
  Acknowledge = 'ui:wallet:ack'
}

export type Message = Omit<JsonRPCRequest, 'id'> & {id?: number};

export type JsonRpcSubscribeResult = {subscription: string};
export type JsonRpcUnsubscribeResult = {success: boolean};
