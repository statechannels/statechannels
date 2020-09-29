import {MessageQueuedNotification, Address} from '@statechannels/client-api-schema';
import {StateVariables} from '@statechannels/wallet-core';

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
};
export type LedgerFundChannels = {
  type: 'LedgerFundChannels';
  channelId: Bytes32;
};

/*
Action creators
*/

const actionConstructor = <A extends ProtocolAction = ProtocolAction>(type: A['type']) => (
  props: Omit<A, 'type'>
): A => ({...props, type} as A);

export const noAction = undefined;

export const requestLedgerFunding = actionConstructor<RequestLedgerFunding>('RequestLedgerFunding');
export const fundChannel = actionConstructor<FundChannel>('FundChannel');
export const notifyApp = actionConstructor<NotifyApp>('NotifyApp');
export const signState = actionConstructor<SignState>('SignState');

export const ledgerFundChannels = actionConstructor<LedgerFundChannels>('LedgerFundChannels');

/*
Guards
*/

const guard = <T extends ProtocolAction>(type: ProtocolAction['type']) => (
  a: ProtocolAction
): a is T => a.type === type;

export const isSignState = guard<SignState>('SignState');
export const isNotifyApp = guard<NotifyApp>('NotifyApp');
export const isFundChannel = guard<FundChannel>('FundChannel');
export const isRequestLedgerFunding = guard<RequestLedgerFunding>('RequestLedgerFunding');
export const isOutgoing = isNotifyApp;

export const isLedgerFundChannels = guard<LedgerFundChannels>('LedgerFundChannels');

/*
Types
*/

export type ApplicationProtocolAction = SignState | NotifyApp | FundChannel | RequestLedgerFunding;
export type LedgerProtocolAction = LedgerFundChannels;

export type ProtocolAction = ApplicationProtocolAction | LedgerProtocolAction;
