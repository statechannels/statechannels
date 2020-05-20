import {JsonRpcRequest, JsonRpcResponse} from '../utils';
import {ChannelId, ChannelResult} from '../data-types';

export type ChallengeChannelParams = ChallengeChannelRequest['params']; // for backwards compatibility
export type ChallengeChannelRequest = JsonRpcRequest<'ChallengeChannel', {channelId: ChannelId}>;
export type ChallengeChannelResponse = JsonRpcResponse<ChannelResult>;
