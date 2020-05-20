import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse} from '../utils';

export type JoinChannelParams = {channelId: ChannelId};
export type JoinChannelRequest = JsonRpcRequest<'JoinChannel', JoinChannelParams>;
export type JoinChannelResponse = JsonRpcResponse<ChannelResult>;
