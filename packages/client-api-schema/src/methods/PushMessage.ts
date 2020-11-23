import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '../jsonrpc-header-types';
import { Message } from '../data-types';
import { ErrorCodes as AllErrors } from '../error-codes';

export type PushMessageParams = PushMessageRequest['params']; // included for backwards compatibility

export type PushMessageResult = { success: boolean };
export type PushMessageRequest = JsonRpcRequest<'PushMessage', Message>;
export type PushMessageResponse = JsonRpcResponse<PushMessageResult>;

type ErrorCodes = AllErrors['PushMessage'];
type NotYourTurn = JsonRpcError<ErrorCodes['WrongParticipant'], 'Wrong participant'>;

export type PushMessageError = NotYourTurn;
