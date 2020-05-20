import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';

export type CloseChannelParams = {channelId: ChannelId};
export type CloseChannelRequest = JsonRpcRequest<'CloseChannel', CloseChannelParams>;
export type CloseChannelResponse = JsonRpcResponse<ChannelResult>;

export const NotYourTurnErrorCode = 300;
export type NotYourTurnError = JsonRpcError<typeof NotYourTurnErrorCode, 'Not your turn'>;
