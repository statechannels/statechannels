/**
 * Note these types are very generic and duplicated (but not exported)
 * inside the client-api-schema package, too.
 */

import {ErrorResponse} from '@statechannels/client-api-schema';

/**
 * Specifies request headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 * @beta
 */
export interface JsonRpcRequest<MethodName = string, RequestParams = any> {
  /**
   * Identifier for the resquest
   *
   * @remarks To be matched in a response
   */
  id?: number;
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
export interface JsonRpcResponse<ResponseType = any> {
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
export type JsonRpcError = {
  /**
   * Error code
   */
  code: number;
  /**
   * Error code
   */
  message: string;
  /**
   * Error data
   */
  data?: {
    [key: string]: any;
  };
};

/**
 * Specifies notification headers as per {@link https://www.jsonrpc.org/specification | JSON-RPC 2.0 Specification }
 *
 * @remarks
 * Note one difference to the JSON-RPC spec is that notifications originate from the wallet (i.e. the Server, not the Client).
 *
 * @beta
 */
export interface JsonRpcNotification<NotificationName = string, NotificationParams = any> {
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
export function isJsonRpcRequest<T>(message: any): message is JsonRpcRequest<T, any> {
  return message.data && message.data.jsonrpc && message.data.jsonrpc === '2.0';
}

/**
 * Type guard for {@link JsonRpcNotification | JsonRpcNotification}
 *
 * @returns true if the message is a JSON-RPC notification, false otherwise
 * @beta
 */
export function isJsonRpcNotification<T>(message: any): message is JsonRpcNotification<T, any> {
  return 'method' in message && !('id' in message);
}
/**
 * Type guard for {@link JsonRpcResponse| JsonRpcResponse}
 *
 * @returns true if the message is a JSON-RPC response, false otherwis
 * @beta
 */
export function isJsonRpcResponse(message: any): message is JsonRpcResponse {
  return 'result' in message;
}
/**
 * Type guard for {@link JsonRpcErrorResponse | JsonRpcErrorResponse}
 *
 * @returns true if the message is a JSON-RPC error response, false otherwise
 * @beta
 */
export function isJsonRpcErrorResponse(message: any): message is JsonRpcErrorResponse {
  return 'error' in message;
}
