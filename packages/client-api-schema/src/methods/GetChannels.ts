import {JsonRpcRequest, JsonRpcResponse} from '../utils';
import {ChannelResult} from '../data-types';

export type GetChannelsRequest = JsonRpcRequest<'GetChannels', {includeClosed?: boolean}>;
export type GetChannelsResponse = JsonRpcResponse<ChannelResult[]>;
