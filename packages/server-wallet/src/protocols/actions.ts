import {MessageQueuedNotification} from '@statechannels/client-api-schema';
import {Address, SimpleAllocation, StateVariables} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';

/*
Actions that protocols can declare.
*/

export type Notice = Omit<MessageQueuedNotification, 'jsonrpc'>;
export type SignState = {type: 'SignState'; channelId: Bytes32} & StateVariables;

export type ProposeLedgerUpdate = {
  type: 'ProposeLedgerUpdate';
  channelId: Bytes32;
  outcome: SimpleAllocation;
  nonce: number;
  signingAddress: Address;
};

/*
Action creators
*/

export const noAction = undefined;

const actionConstructor = <A extends ProtocolAction = ProtocolAction>(type: A['type']) => (
  props: Omit<A, 'type'>
): A => ({...props, type} as A);
export const signState = actionConstructor<SignState>('SignState');

export type Outgoing = Notice;

export type ProtocolAction = SignState | ProposeLedgerUpdate;
