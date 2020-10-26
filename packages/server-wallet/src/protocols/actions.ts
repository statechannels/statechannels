import {MessageQueuedNotification, Address} from '@statechannels/client-api-schema';
import {StateVariables} from '@statechannels/wallet-core';

import {Bytes32, Uint256} from '../type-aliases';

/*
Actions that protocols can declare.
*/

export type Notice = Omit<MessageQueuedNotification, 'jsonrpc'>;
export type SignState = {type: 'SignState'; channelId: Bytes32} & StateVariables;
export type FundChannel = {
  type: 'FundChannel';
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};
export type Withdraw = {type: 'Withdraw'; channelId: Bytes32};
export type CompleteObjective = {
  type: 'CompleteObjective';
  /* TODO: (Stored Objectives) put objective id here? */ channelId: Bytes32;
};

/*
Action creators
*/

export const noAction = undefined;

const actionConstructor = <A extends ProtocolAction = ProtocolAction>(type: A['type']) => (
  props: Omit<A, 'type'>
): A => ({...props, type} as A);
export const fundChannel = actionConstructor<FundChannel>('FundChannel');
export const signState = actionConstructor<SignState>('SignState');
export const completeObjective = actionConstructor<CompleteObjective>('CompleteObjective');
export const withdraw = actionConstructor<Withdraw>('Withdraw');

const guard = <T extends ProtocolAction>(type: ProtocolAction['type']) => (
  a: ProtocolAction
): a is T => a.type === type;

export const isSignState = guard<SignState>('SignState');
export const isFundChannel = guard<FundChannel>('FundChannel');

export type Outgoing = Notice;

export type ProtocolAction = SignState | FundChannel | Withdraw | CompleteObjective;
