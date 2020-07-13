import { StateVariables } from '@statechannels/wallet-core';
import { Bytes32 } from '../type-aliases';
import { AddressedMessage } from '../wallet';
import { Notification } from '@statechannels/client-api-schema';

/*
Actions that protocols can declare.
*/

type UpdateOpts = Partial<StateVariables>;
type UpdateChannel = { type: 'UpdateChannel'; channelId: Bytes32 } & UpdateOpts;
type SignState = { type: 'SignState'; channelId: Bytes32; hash: Bytes32 };
type SendMessage = { type: 'SendMessage'; message: AddressedMessage };
type NotifyApp = { type: 'NotifyApp'; notice: Notification };

export type ProtocolAction =
  | UpdateChannel
  | SignState
  | SendMessage
  | NotifyApp;
