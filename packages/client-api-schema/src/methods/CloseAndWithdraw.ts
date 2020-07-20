import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {ErrorCodes} from '../error-codes';

export type CloseAndWithdrawParams = {hubAddress: string; playerParticipantId: string};
export type CloseAndWithdrawRequest = JsonRpcRequest<'CloseAndWithdraw', CloseAndWithdrawParams>;
export type CloseAndWithdrawResponse = JsonRpcResponse<{success: boolean}>;
export type CloseAndWithdrawError = JsonRpcError<
  ErrorCodes['CloseAndWithdraw']['UserDeclined'],
  'User declined'
>;
