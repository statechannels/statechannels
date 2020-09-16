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
  operation: 'HashState ';
  state: State;
};
export type StateChannelWorkerData = SignStateRequest | RecoverAddressRequest | HashStateRequest;

export function isStateChannelWorkerData(data: any): data is StateChannelWorkerData {
  return (
    'operation' in data &&
    (data.operation === 'SignState' ||
      data.operation === 'RecoverAddress' ||
      data.operation === 'HashState')
  );
}

export function isSignStateRequest(data: any): data is SignStateRequest {
  return isStateChannelWorkerData(data) && data.operation === 'SignState';
}

export function isRecoverAddressRequest(data: any): data is RecoverAddressRequest {
  return isStateChannelWorkerData(data) && data.operation === 'RecoverAddress';
}
export function isHashStateRequest(data: any): data is HashStateRequest {
  return isStateChannelWorkerData(data) && data.operation === 'HashState ';
}
