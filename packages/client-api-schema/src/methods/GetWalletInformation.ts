import {JsonRpcRequest, JsonRpcResponse} from '../jsonrpc-header-types';
import {Address} from '../data-types';

export type GetWalletInformationRequest = JsonRpcRequest<'GetWalletInformation', {}>;
export type GetWalletInformationResponse = JsonRpcResponse<{
  signingAddress: Address;
  destinationAddress: Address | undefined;
  walletVersion: string;
}>;
