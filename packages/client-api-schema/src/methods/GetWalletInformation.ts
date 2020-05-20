import {JsonRpcRequest, JsonRpcResponse} from '../utils';
import {Address} from '../data-types';

export type GetWalletInformationRequest = JsonRpcRequest<'GetWalletInformation', {}>;
export type GetWalletInformationResponse = JsonRpcResponse<{
  signingAddress: Address;
  selectedAddress: Address | null;
  walletVersion: string;
}>;
