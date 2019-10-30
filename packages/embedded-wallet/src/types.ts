import {JsonRpcErrorCodes} from './message-dispatchers/error-codes';

export type JsonRpcRequest = {
  id?: number;
  jsonrpc: '2.0';
  method: string;
  params: any[];
};

export type JsonRpcResponse<ResultType = any> = {
  id: number;
  jsonrpc: '2.0';
  result: ResultType;
};

export type JsonRpcError = {
  code: JsonRpcErrorCodes;
  message: string;
  data?: {
    [key: string]: any;
  };
};

export type JsonRpcErrorResponse = {
  id: number;
  jsonrpc: '2.0';
  error: JsonRpcError;
};
