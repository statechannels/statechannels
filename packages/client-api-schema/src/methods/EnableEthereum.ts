import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {Address} from '../data-types';
import {ErrorCodes} from '../error-codes';

export type EnableEthereumRequest = JsonRpcRequest<'EnableEthereum', {}>;
export type EnableEthereumResponse = JsonRpcResponse<{
  signingAddress: Address;
  selectedAddress: Address;
  walletVersion: string;
}>;

export type EnableEthereumError = JsonRpcError<
  ErrorCodes['EnableEthereum']['EthereumNotEnabled'],
  'Ethereum Not Enabled'
>;
