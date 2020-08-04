import {JsonRpcRequest, JsonRpcResponse} from '../jsonrpc-header-types';
import {ChannelId, ChannelResult} from '../data-types';

export interface ChallengeChannelParams {
  channelId: ChannelId;
} // for backwards compatibility
export type ChallengeChannelRequest = JsonRpcRequest<'ChallengeChannel', ChallengeChannelParams>;
export type ChallengeChannelResponse = JsonRpcResponse<ChannelResult>;
