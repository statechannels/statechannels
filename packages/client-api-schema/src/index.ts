/**
 * @packageDocumentation Defines and validates the data types communicated between an app and a wallet
 *
 * @remarks
 * Exposes functions that can validate Responses and Requests, as well as to cast them as the correct Type
 */
export * from './types';

export {parseRequest, parseResponse} from './validation';
