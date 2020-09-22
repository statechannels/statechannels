import {MessageQueuedNotification, Address} from '@statechannels/client-api-schema';
import {AllocationItem, StateVariables} from '@statechannels/wallet-core';

import {Bytes32, Uint256} from '../type-aliases';

/*
Actions that protocols can declare.
*/

export type Notice = Omit<MessageQueuedNotification, 'jsonrpc'>;
export type SignState = {type: 'SignState'; channelId: Bytes32} & StateVariables;
export type NotifyApp = {type: 'NotifyApp'; notice: Notice};
export type FundChannel = {
  type: 'FundChannel';
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};
export type RequestLedgerFunding = {
  type: 'RequestLedgerFunding';
  channelId: Bytes32;
  assetHolderAddress: Address;
  deductions: AllocationItem[];
};

/*
Action creators
*/

export const noAction = undefined;

const actionConstructor = <A extends ProtocolAction = ProtocolAction>(type: A['type']) => (
  props: Omit<A, 'type'>
): A => ({...props, type} as A);
export const requestLedgerFunding = actionConstructor<RequestLedgerFunding>('RequestLedgerFunding');
export const fundChannel = actionConstructor<FundChannel>('FundChannel');
export const notifyApp = actionConstructor<NotifyApp>('NotifyApp');
export const signState = actionConstructor<SignState>('SignState');

const guard = <T extends ProtocolAction>(type: ProtocolAction['type']) => (
  a: ProtocolAction
): a is T => a.type === type;

export const isSignState = guard<SignState>('SignState');
export const isNotifyApp = guard<NotifyApp>('NotifyApp');
export const isFundChannel = guard<FundChannel>('FundChannel');
export const isLedgerFundChannel = guard<FundChannel>('RequestLedgerFunding');

export type Outgoing = Notice;
export const isOutgoing = isNotifyApp;

export type ProtocolAction = SignState | NotifyApp | FundChannel | RequestLedgerFunding;
