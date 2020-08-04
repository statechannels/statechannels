/**
 * @packageDocumentation Defines and validates the data types communicated between an app and a wallet
 *
 * @remarks
 * Also exposes functions that can validate Responses and Requests, as well as to cast them as the correct Type.
 *
 * Example request:
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "PushMessage",
 *   "id": 1,
 *   "params": {
 *     "recipient": "user123",
 *     "sender": "user456",
 *     "data": "0x123.."
 *   }
 * }
 * ```
 *
 * Example response:
 *
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "id": 1,
 *   "result": {"success": true}
 * }
 * ```
 */
export * from './types';
export * from './jsonrpc-header-types';

export {parseRequest, parseResponse} from './validation';
