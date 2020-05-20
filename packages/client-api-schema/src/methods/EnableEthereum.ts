import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {Address} from '../data-types';

export type EnableEthereumRequest = JsonRpcRequest<'EnableEthereum', {}>;
export type EnableEthereumResponse = JsonRpcResponse<{
  signingAddress: Address;
  selectedAddress: Address;
  walletVersion: string;
}>;

export const EthereumNotEnabledErrorCode = 100;
export type EnableEthereumError = JsonRpcError<
  typeof EthereumNotEnabledErrorCode,
  'Ethereum Not Enabled'
>;
