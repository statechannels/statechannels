import {MessageQueuedNotification, Address} from '@statechannels/client-api-schema';
import {AllocationItem, StateVariables} from '@statechannels/wallet-core';

import {Bytes32, Uint256} from '../type-aliases';

export type Outgoing = Omit<MessageQueuedNotification, 'jsonrpc'>;

/*
Actions that protocols can declare.
*/

export type SignState = {type: 'SignState'; channelId: Bytes32} & StateVariables;
export type NotifyApp = {type: 'NotifyApp'; notice: Outgoing};
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
export type LedgerFundChannel = {
  type: 'LedgerFundChannel';
  fundingChannelid: Bytes32;
};

/*
Action creators
*/

const actionConstructor = <A extends {type: string} = {type: string}>(type: A['type']) => (
  props: Omit<A, 'type'>
): A => ({...props, type} as A);

const appAction = <A extends ApplicationProtocolAction>(t: A['type']) => actionConstructor<A>(t);
const ledgerAction = <A extends LedgerProtocolAction>(t: A['type']) => actionConstructor<A>(t);

export const noAction = undefined;

export const requestLedgerFunding = appAction<RequestLedgerFunding>('RequestLedgerFunding');
export const fundChannel = appAction<FundChannel>('FundChannel');
export const notifyApp = appAction<NotifyApp>('NotifyApp');
export const signState = appAction<SignState>('SignState');

export const ledgerFundChannel = ledgerAction<LedgerFundChannel>('LedgerFundChannel');

/*
Guards
*/

const guard = <T extends {type: string}>(type: T['type']) => (a: T): a is T => a.type === type;

const appGuard = <A extends ApplicationProtocolAction>(t: A['type']) => guard<A>(t);
const ledgerGuard = <A extends LedgerProtocolAction>(t: A['type']) => guard<A>(t);

export const isSignState = appGuard<SignState>('SignState');
export const isNotifyApp = appGuard<NotifyApp>('NotifyApp');
export const isFundChannel = appGuard<FundChannel>('FundChannel');
export const isRequestLedgerFunding = appGuard<RequestLedgerFunding>('RequestLedgerFunding');
export const isOutgoing = isNotifyApp;

export const isLedgerFundChannel = ledgerGuard<LedgerFundChannel>('LedgerFundChannel');

/*
Types
*/

export type ApplicationProtocolAction = SignState | NotifyApp | FundChannel | RequestLedgerFunding;
export type LedgerProtocolAction = LedgerFundChannel;

export type ProtocolAction = ApplicationProtocolAction | LedgerProtocolAction;
