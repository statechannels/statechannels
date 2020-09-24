import {UpdateChannelParams} from '@statechannels/client-api-schema';

type UpdateChannelRequest = {
  operation: 'UpdateChannel';
  args: UpdateChannelParams;
};

type PushMessageRequest = {
  operation: 'PushMessage';
  args: unknown;
};

export type StateChannelWorkerData = UpdateChannelRequest | PushMessageRequest;

export function isStateChannelWorkerData(data: any): data is StateChannelWorkerData {
  return (
    'operation' in data && (data.operation === 'UpdateChannel' || data.operation === 'PushMessage')
  );
}

const guard = <T extends StateChannelWorkerData>(operation: T['operation']) => (
  data: any
): data is T => isStateChannelWorkerData(data) && data.operation === operation;

export const isUpdateChannelRequest = guard<UpdateChannelRequest>('UpdateChannel');
export const isPushMessageRequest = guard<PushMessageRequest>('PushMessage');
