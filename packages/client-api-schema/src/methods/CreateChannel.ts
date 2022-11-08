import {Participant, Address, ChannelResult, SingleAssetOutcome} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../jsonrpc-header-types';
import {ErrorCodes as AllErrors} from '../error-codes';

export type FundingStrategy = 'Direct' | 'Ledger' | 'Virtual' | 'Fake' | 'Unknown';

export interface CreateChannelParams {
  participants: Participant[];
  outcome: SingleAssetOutcome[];
  appDefinition: Address;
  appData: string;
  fundingStrategy: FundingStrategy;
  fundingLedgerChannelId?: Address;
  challengeDuration: number;
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

export type CreateChannelError = SigningAddressNotFound | InvalidAppDefinition;
