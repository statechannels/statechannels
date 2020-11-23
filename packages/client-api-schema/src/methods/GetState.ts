import { ChannelId, ChannelResult } from '../data-types';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '../jsonrpc-header-types';
import { ErrorCodes as AllErrors } from '../error-codes';

export interface GetStateParams {
  channelId: ChannelId;
}
export type GetStateRequest = JsonRpcRequest<'GetState', GetStateParams>;
export type GetStateResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllErrors['GetState'];
type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Could not find channel'>;

export type GetStateError = ChannelNotFound;
