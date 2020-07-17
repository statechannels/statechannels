import { StateVariables } from '@statechannels/wallet-core';
import { Bytes32 } from '../type-aliases';
import { Notification } from '@statechannels/client-api-schema';

/*
Actions that protocols can declare.
*/

type UpdateOpts = Partial<StateVariables>;
type UpdateChannel = { type: 'UpdateChannel'; channelId: Bytes32 } & UpdateOpts;
type SignState = { type: 'SignState'; channelId: Bytes32; hash: Bytes32 };
type NotifyApp = { type: 'NotifyApp'; notice: Omit<Notification, 'jsonrpc'> };

const guard = <T extends ProtocolAction>(type: ProtocolAction['type']) => (
  a: ProtocolAction
): a is T => a.type === type;

export const isUpdateChannel = guard<UpdateChannel>('UpdateChannel');
export const isSignState = guard<SignState>('SignState');
export const isNotifyApp = guard<NotifyApp>('NotifyApp');

export const isOutgoing = isNotifyApp;

export type Outgoing = NotifyApp;
export type Internal = UpdateChannel | SignState;

export const isInternal = (a: ProtocolAction): a is Internal =>
  [isSignState, isUpdateChannel].some(g => g(a));

export type ProtocolAction = UpdateChannel | SignState | NotifyApp;
