import {JsonRpcRequest, JsonRpcResponse} from '../jsonrpc-header-types';
import {Message} from '../data-types';

export type PushMessageParams = PushMessageRequest['params']; // included for backwards compatibility

export type PushMessageResult = {success: boolean};
export type PushMessageRequest = JsonRpcRequest<'PushMessage', Message>;
export type PushMessageResponse = JsonRpcResponse<PushMessageResult>;
