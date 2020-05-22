import {Participant, Allocation, Address, ChannelResult} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse} from '../utils';

export type FundingStrategy = 'Direct' | 'Ledger' | 'Virtual';
export interface CreateChannelParams {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: Address;
  appData: string;
  fundingStrategy: FundingStrategy;
}
export type CreateChannelRequest = JsonRpcRequest<'CreateChannel', CreateChannelParams>;
export type CreateChannelResponse = JsonRpcResponse<ChannelResult>;
