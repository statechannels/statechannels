export interface JsonRpcRequest<MethodName, RequestParams> {
  id: number; // in the json-rpc spec this is optional, but we require it for all our requests
  jsonrpc: '2.0';
  method: MethodName;
  params: RequestParams;
}
export interface JsonRpcResponse<ResultType> {
  id: number;
  jsonrpc: '2.0';
  result: ResultType;
}

export interface JsonRpcNotification<NotificationName, NotificationParams> {
  jsonrpc: '2.0';
  method: NotificationName;
  params: NotificationParams;
}

// TODO: These are not utils
export const UserDeclinedErrorCode = 200;
export const EthereumNotEnabledErrorCode = 100;
export const NotYourTurnErrorCode = 300;

type ErrorCode =
  | typeof UserDeclinedErrorCode
  | typeof EthereumNotEnabledErrorCode
  | typeof NotYourTurnErrorCode;
export interface JsonRpcError<Code extends ErrorCode, Message, Data = undefined> {
  id: number;
  jsonrpc: '2.0';
  error: Data extends undefined
    ? {code: Code; message: Message}
    : {code: Code; message: Message; data: Data};
}
