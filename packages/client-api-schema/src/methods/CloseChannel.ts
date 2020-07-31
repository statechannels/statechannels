import {ChannelId, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {ErrorCodes as AllErrors} from '../error-codes';

export interface CloseChannelParams {
  channelId: ChannelId;
}
export type CloseChannelRequest = JsonRpcRequest<'CloseChannel', CloseChannelParams>;
export type CloseChannelResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllErrors['CloseChannel'];

type NotYourTurn = JsonRpcError<ErrorCodes['NotYourTurn'], 'Not your turn'>;
type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Channel not found'>;

export type CloseChannelError = NotYourTurn | ChannelNotFound;
