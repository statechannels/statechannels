import {JsonRpcRequest, JsonRpcResponse, JsonRpcError, EthereumNotEnabledErrorCode} from '../utils';
import {Address} from '../data-types';

export type EnableEthereumRequest = JsonRpcRequest<'EnableEthereum', {}>;
export type EnableEthereumResponse = JsonRpcResponse<{
  signingAddress: Address;
  selectedAddress: Address;
  walletVersion: string;
}>;

export type EnableEthereumError = JsonRpcError<
  typeof EthereumNotEnabledErrorCode,
  'Ethereum Not Enabled'
>;
