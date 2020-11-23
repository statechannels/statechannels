import { ChannelId, ChannelResult } from '../data-types';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '../jsonrpc-header-types';
import { ErrorCodes as AllErrors } from '../error-codes';

export interface JoinChannelParams {
  channelId: ChannelId;
}
export type JoinChannelRequest = JsonRpcRequest<'JoinChannel', JoinChannelParams>;
export type JoinChannelResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllErrors['JoinChannel'];
type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Could not find channel'>;
type InvalidTransition = JsonRpcError<ErrorCodes['InvalidTransition'], 'Invalid Transition'>;

export type JoinChannelError = ChannelNotFound | InvalidTransition;
