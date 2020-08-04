import {JsonRpcNotification} from './jsonrpc-header-types';
import {ChannelResult, Message, DomainBudget} from './data-types';

// these notifications come *from* the wallet, which is not strictly how JSON-RPC should work
// (since we treat the wallet as the 'server')

export type ChannelProposedNotification = JsonRpcNotification<'ChannelProposed', ChannelResult>;
export type ChannelUpdatedNotification = JsonRpcNotification<'ChannelUpdated', ChannelResult>;
export type ChannelClosingNotification = JsonRpcNotification<'ChannelClosed', ChannelResult>;
export type MessageQueuedNotification = JsonRpcNotification<'MessageQueued', Message>;
export type BudgetUpdatedNotification = JsonRpcNotification<'BudgetUpdated', DomainBudget>;
export type UiNotification = JsonRpcNotification<'UIUpdate', {showWallet: boolean}>;

export type StateChannelsNotification =
  | ChannelProposedNotification
  | ChannelUpdatedNotification
  | ChannelClosingNotification
  | BudgetUpdatedNotification
  | MessageQueuedNotification
  | UiNotification;

type FilterByMethod<T, Method> = T extends {method: Method} ? T : never;

export type StateChannelsNotificationType = {
  [T in StateChannelsNotification['method']]: [
    FilterByMethod<StateChannelsNotification, T>['params']
  ];
};
