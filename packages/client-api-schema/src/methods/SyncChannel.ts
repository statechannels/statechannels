import {ChannelResult, ChannelId} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../jsonrpc-header-types';
import {ErrorCodes as AllErrors} from '../error-codes';

export interface SyncChannelParams {
  channelId: ChannelId
}
export type SyncChannelRequest = JsonRpcRequest<'SyncChannel', SyncChannelParams>;
export type SyncChannelResponse = JsonRpcResponse<{}>;

type ErrorCodes = AllErrors['SyncChannel'];

type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Channel not found'>;

export type SyncChannelError = ChannelNotFound;
