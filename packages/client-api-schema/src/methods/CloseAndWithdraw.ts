import {Participant} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse, JsonRpcError} from '../utils';
import {ErrorCodes} from '../error-codes';

export type CloseAndWithdrawParams = {hub: Participant; playerParticipantId: string};
export type CloseAndWithdrawRequest = JsonRpcRequest<'CloseAndWithdraw', CloseAndWithdrawParams>;
export type CloseAndWithdrawResponse = JsonRpcResponse<{success: boolean}>;
export type CloseAndWithdrawError = JsonRpcError<
  ErrorCodes['CloseAndWithdraw']['UserDeclined'],
  'User declined'
>;
