import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError, NotYourTurnErrorCode} from '../utils';

export type CloseChannelParams = {channelId: ChannelId};
export type CloseChannelRequest = JsonRpcRequest<'CloseChannel', CloseChannelParams>;
export type CloseChannelResponse = JsonRpcResponse<ChannelResult>;
export type NotYourTurnError = JsonRpcError<typeof NotYourTurnErrorCode, 'Not your turn'>;
