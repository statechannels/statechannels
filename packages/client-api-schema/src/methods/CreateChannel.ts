import {Participant, Allocation, Address, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../jsonrpc-header-types';
import {ErrorCodes as AllErrors} from '../error-codes';

export type FundingStrategy = 'Direct' | 'Ledger' | 'Virtual' | 'Unfunded';
export interface CreateChannelParams {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: Address;
  appData: string;
  fundingStrategy: FundingStrategy;
}
export type CreateChannelRequest = JsonRpcRequest<'CreateChannel', CreateChannelParams>;
export type CreateChannelResponse = JsonRpcResponse<ChannelResult>;

type ErrorCodes = AllErrors['CreateChannel'];
type SigningAddressNotFound = JsonRpcError<
  ErrorCodes['SigningAddressNotFound'],
  'Could not find signing address'
>;
type InvalidAppDefinition = JsonRpcError<
  ErrorCodes['InvalidAppDefinition'],
  'Invalid App Definition'
>;
type UnsupportedToken = JsonRpcError<ErrorCodes['UnsupportedToken'], 'This token is not supported'>;

export type CreateChannelError = SigningAddressNotFound | InvalidAppDefinition | UnsupportedToken;
