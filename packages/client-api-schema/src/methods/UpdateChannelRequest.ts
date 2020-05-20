import {ChannelId, Participant, Allocation, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse} from '../utils';

export interface UpdateChannelParams {
  channelId: ChannelId;
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}
export type UpdateChannelRequest = JsonRpcRequest<'UpdateChannel', UpdateChannelParams>;
export type UpdateChannelResponse = JsonRpcResponse<ChannelResult>;
