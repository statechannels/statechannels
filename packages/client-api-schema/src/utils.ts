import {ErrorResponse, Request, Response} from './types';
import {Notification} from './notifications';
/**
 * Specifies request headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 * @beta
 */
export interface JsonRpcRequest<MethodName = string, RequestParams = object> {
  /**
   * Identifier for the resquest
   *
   * @remarks To be matched in a response
   */
  id: number;
  /**
   * Spec version
   */
  jsonrpc: '2.0';
  /**
   * Generic type of the request method
   */
  method: MethodName;
  /**
   * Request parameters
   */
  params: RequestParams;
}

/**
 * Specifies response headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 * @beta
 */
export interface JsonRpcResponse<ResponseType = object> {
  /**
   * Identifier for the response
   * @remarks Matches that of a request
   */
  id: number;
  /**
   * Spec version
   */
  jsonrpc: '2.0';
  /**
   * The generic type of the response
   */
  result: ResponseType;
}

/**
 * Specifies error headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 * @beta
 */
export type JsonRpcError<Code extends number, Message, Data = undefined> = {
  /**
   * Error code
   */
  code: Code;
  /**
   * Error code
   */
  message: Message;
  /**
   * Error data
   */
  error?: Data extends undefined
    ? {code: Code; message: Message}
    : {code: Code; message: Message; data: Data};
};

/**
 * Specifies notification headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 *
 * @remarks
 * Note one difference to the JSON-RPC spec is that notifications originate from the wallet (i.e. the Server, not the Client).
 *
 * @beta
 */
export interface JsonRpcNotification<
  NotificationName = Notification['method'],
  NotificationParams = Notification['params']
> {
  /**
   * Spec version
   */
  jsonrpc: '2.0';
  /**
   * Generic type of the Notification name
   */
  method: NotificationName;
  /**
   * Generic type of the Notification parameters
   */
  params: NotificationParams;
}

/**
 * Specifies error headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 * @beta
 */
export type JsonRpcErrorResponse = ErrorResponse;

/**
 * Type guard for {@link JsonRpcRequest | JsonRpcRequest}
 *
 * @returns true if the message is a JSON-RPC request, false otherwise
 * @beta
 */
export function isJsonRpcRequest<T extends Request['method']>(
  message: object
): message is JsonRpcRequest<T, Request['params']> {
  return 'id' in message && 'params' in message;
}

/**
 * Type guard for {@link JsonRpcNotification | JsonRpcNotification}
 *
 * @returns true if the message is a JSON-RPC notification, false otherwise
 * @beta
 */
export function isJsonRpcNotification<T extends Notification['method']>(
  message: object
): message is JsonRpcNotification<T, Notification['params']> {
  return 'method' in message && !('id' in message);
}
/**
 * Type guard for {@link JsonRpcResponse| JsonRpcResponse}
 *
 * @returns true if the message is a JSON-RPC response, false otherwis
 * @beta
 */
export function isJsonRpcResponse(message: object): message is JsonRpcResponse {
  return 'result' in message;
}
/**
 * Type guard for {@link JsonRpcErrorResponse | JsonRpcErrorResponse}
 *
 * @returns true if the message is a JSON-RPC error response, false otherwise
 * @beta
 */
export function isJsonRpcErrorResponse(message: object): message is JsonRpcErrorResponse {
  return 'id' in message && 'error' in message;
}
