import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse} from '../jsonrpc-header-types';

export interface GetStateParams {
  channelId: ChannelId;
}
export type GetStateRequest = JsonRpcRequest<'GetState', GetStateParams>;
export type GetStateResponse = JsonRpcResponse<ChannelResult>;
