import {Participant, Allocation, Address, ChannelResult, Message} from '../data-types';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcErrorResponse
} from '../jsonrpc-header-types';
import {ErrorCodes} from '../error-codes';

export type FundingStrategy = 'Direct' | 'Ledger' | 'Virtual';

/**
 * Request a new channel
 */
export interface CreateChannel {
  request: JsonRpcRequest<'CreateChannel', CreateChannelParams>;
  response: JsonRpcResponse<ChannelResult>;
  errorResponse: JsonRpcErrorResponse<CreateChannelError>;
}

export interface CreateChannelParams {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: Address;
  appData: string;
  fundingStrategy: FundingStrategy;
}
export type CreateChannelRequest = JsonRpcRequest<'CreateChannel', CreateChannelParams>;
export type CreateChannelResponse = JsonRpcResponse<ChannelResult>;

export type CreateChannelErrorCodes = ErrorCodes['CreateChannel'];
export type SigningAddressNotFound = JsonRpcError<
  CreateChannelErrorCodes['SigningAddressNotFound'],
  'Could not find signing address'
>;
export type InvalidAppDefinition = JsonRpcError<
  CreateChannelErrorCodes['InvalidAppDefinition'],
  'Invalid App Definition'
>;
export type UnsupportedToken = JsonRpcError<
  CreateChannelErrorCodes['UnsupportedToken'],
  'This token is not supported'
>;

export type CreateChannelError = SigningAddressNotFound | InvalidAppDefinition | UnsupportedToken;
