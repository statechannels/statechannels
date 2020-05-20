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

export interface JsonRpcError<Code, Message, Data = undefined> {
  id: number;
  jsonrpc: '2.0';
  error: Data extends undefined
    ? {code: Code; message: Message}
    : {code: Code; message: Message; data: Data};
}
