import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {ErrorCodes} from '../error-codes';

export type CloseChannelParams = {channelId: ChannelId};
export type CloseChannelRequest = JsonRpcRequest<'CloseChannel', CloseChannelParams>;
export type CloseChannelResponse = JsonRpcResponse<ChannelResult>;

export type NotYourTurnError = JsonRpcError<
  ErrorCodes['CloseChannel']['NotYourTurn'],
  'Not your turn'
>;
