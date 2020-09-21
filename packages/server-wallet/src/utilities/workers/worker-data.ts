import {UpdateChannelParams} from '@statechannels/client-api-schema';
import {State, StateWithHash} from '@statechannels/wallet-core';

type SignStateRequest = {
  operation: 'SignState';
  state: StateWithHash;
  privateKey: string;
};

type RecoverAddressRequest = {
  operation: 'RecoverAddress';
  state: StateWithHash;
  signature: string;
};

type HashStateRequest = {
  operation: 'HashState';
  state: State;
};

type UpdateChannelRequest = {
  operation: 'UpdateChannel';
  args: UpdateChannelParams;
};

type PushMessageRequest = {
  operation: 'PushMessage';
  args: unknown;
};

export type StateChannelWorkerData =
  | SignStateRequest
  | RecoverAddressRequest
  | HashStateRequest
  | UpdateChannelRequest
  | PushMessageRequest;

export function isStateChannelWorkerData(data: any): data is StateChannelWorkerData {
  return (
    'operation' in data &&
    (data.operation === 'SignState' ||
      data.operation === 'RecoverAddress' ||
      data.operation === 'HashState' ||
      data.operation === 'UpdateChannel' ||
      data.operation === 'PushMessage')
  );
}

const guard = <T extends StateChannelWorkerData>(operation: T['operation']) => (
  data: any
): data is T => isStateChannelWorkerData(data) && data.operation === operation;

export const isSignStateRequest = guard<SignStateRequest>('SignState');
export const isRecoverAddressRequest = guard<RecoverAddressRequest>('RecoverAddress');
export const isHashStateRequest = guard<HashStateRequest>('HashState');
export const isUpdateChannelRequest = guard<UpdateChannelRequest>('UpdateChannel');
export const isPushMessageRequest = guard<PushMessageRequest>('PushMessage');
