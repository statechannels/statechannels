import {JsonRpcRequest, JsonRpcResponse} from '../utils';
import {ChannelResult} from '../data-types';

export interface GetChannelsParams {
  includeClosed?: boolean;
}
export type GetChannelsRequest = JsonRpcRequest<'GetChannels', {includeClosed?: boolean}>;
export type GetChannelsResponse = JsonRpcResponse<ChannelResult[]>;
