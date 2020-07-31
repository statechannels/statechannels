import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse} from '../utils';

export interface JoinChannelParams {
  channelId: ChannelId;
}
export type JoinChannelRequest = JsonRpcRequest<'JoinChannel', JoinChannelParams>;
export type JoinChannelResponse = JsonRpcResponse<ChannelResult>;
