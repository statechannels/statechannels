import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../jsonrpc-header-types';
import {Address} from '../data-types';
import {ErrorCodes} from '../error-codes';

// eslint-disable-next-line @typescript-eslint/ban-types
export type EnableEthereumRequest = JsonRpcRequest<'EnableEthereum', {}>;
export type EnableEthereumResponse = JsonRpcResponse<{
  signingAddress: Address;
  destinationAddress: Address;
  walletVersion: string;
}>;

export type EnableEthereumError = JsonRpcError<
  ErrorCodes['EnableEthereum']['EthereumNotEnabled'],
  'Ethereum Not Enabled'
>;
