import {ChannelId, Participant, Allocation, ChannelResult, ChannelStatus} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {ErrorCodes as AllCodes} from '../error-codes';

export interface UpdateChannelParams {
  channelId: ChannelId;
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}
export type UpdateChannelRequest = JsonRpcRequest<'UpdateChannel', UpdateChannelParams>;
export type UpdateChannelResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllCodes['UpdateChannel'];
type ChannelNotFound = JsonRpcError<ErrorCodes['ChannelNotFound'], 'Channel not found'>;
type InvalidTransition = JsonRpcError<
  ErrorCodes['InvalidTransition'],
  'Invalid transition',
  {channelStatus: ChannelStatus; proposedUpdate: UpdateChannelParams}
>;
type InvalidAppData = JsonRpcError<
  ErrorCodes['InvalidAppData'],
  'Invalid app data',
  {appData: string}
>;
type NotYourTurn = JsonRpcError<ErrorCodes['NotYourTurn'], 'Not your turn'>;
type ChannelClosed = JsonRpcError<ErrorCodes['ChannelClosed'], 'Channel closed'>;

export type UpdateChannelError =
  | ChannelNotFound
  | InvalidTransition
  | InvalidAppData
  | NotYourTurn
  | ChannelClosed;
