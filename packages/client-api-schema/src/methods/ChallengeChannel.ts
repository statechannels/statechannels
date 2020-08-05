import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../jsonrpc-header-types';
import {ChannelId, ChannelResult} from '../data-types';
import {ErrorCodes as AllErrors} from '../error-codes';

export interface ChallengeChannelParams {
  channelId: ChannelId;
} // for backwards compatibility
export type ChallengeChannelRequest = JsonRpcRequest<'ChallengeChannel', ChallengeChannelParams>;
export type ChallengeChannelResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllErrors['GetState'];
type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Could not find channel'>;

export type ChallengeChannelError = ChannelNotFound;
