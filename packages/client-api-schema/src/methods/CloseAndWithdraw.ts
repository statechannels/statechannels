import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '../jsonrpc-header-types';
import { ErrorCodes } from '../error-codes';

export interface CloseAndWithdrawParams {
  hubParticipantId: string;
}
export type CloseAndWithdrawRequest = JsonRpcRequest<'CloseAndWithdraw', CloseAndWithdrawParams>;
export type CloseAndWithdrawResponse = JsonRpcResponse<{ success: boolean }>;
export type CloseAndWithdrawError = JsonRpcError<
  ErrorCodes['CloseAndWithdraw']['UserDeclined'],
  'User declined'
>;
