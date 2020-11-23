import { ChannelId, Allocation, ChannelResult, ChannelStatus } from '../data-types';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '../jsonrpc-header-types';
import { ErrorCodes as AllCodes } from '../error-codes';

export interface UpdateChannelParams {
  channelId: ChannelId;
  allocations: Allocation[];
  appData: string;
}
export type UpdateChannelRequest = JsonRpcRequest<'UpdateChannel', UpdateChannelParams>;
export type UpdateChannelResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllCodes['UpdateChannel'];
export type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Channel not found'>;
export type InvalidTransition = JsonRpcError<
  ErrorCodes['InvalidTransition'],
  'Invalid transition',
  { channelStatus: ChannelStatus; proposedUpdate: UpdateChannelParams }
>;
export type InvalidAppData = JsonRpcError<
  ErrorCodes['InvalidAppData'],
  'Invalid app data',
  { appData: string }
>;
export type NotYourTurn = JsonRpcError<ErrorCodes['NotYourTurn'], 'Not your turn'>;
export type ChannelClosed = JsonRpcError<ErrorCodes['ChannelClosed'], 'Channel closed'>;

export type UpdateChannelError =
  | ChannelNotFound
  | InvalidTransition
  | InvalidAppData
  | NotYourTurn
  | ChannelClosed;
