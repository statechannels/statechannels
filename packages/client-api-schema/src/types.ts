import {Notification} from './notifications';
import {JsonRpcError} from './jsonrpc-header-types';
import {
  CreateChannelRequest,
  JoinChannelRequest,
  UpdateChannelRequest,
  GetWalletInformationRequest,
  EnableEthereumRequest,
  GetStateRequest,
  PushMessageRequest,
  ChallengeChannelRequest,
  GetBudgetRequest,
  ApproveBudgetAndFundRequest,
  CloseChannelRequest,
  CloseAndWithdrawRequest,
  GetChannelsRequest,
  CreateChannelResponse,
  JoinChannelResponse,
  UpdateChannelResponse,
  EnableEthereumResponse,
  GetWalletInformationResponse,
  GetStateResponse,
  PushMessageResponse,
  ChallengeChannelResponse,
  GetBudgetResponse,
  CloseChannelResponse,
  ApproveBudgetAndFundResponse,
  CloseAndWithdrawResponse,
  GetChannelsResponse,
  EnableEthereumError,
  CloseAndWithdrawError,
  CloseChannelError,
  UpdateChannelError
} from './methods';

type GenericError = JsonRpcError<500, 'Wallet error'>;

export type Request =
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | GetWalletInformationRequest
  | EnableEthereumRequest
  | GetStateRequest
  | PushMessageRequest
  | ChallengeChannelRequest
  | GetBudgetRequest
  | ApproveBudgetAndFundRequest
  | CloseChannelRequest
  | CloseAndWithdrawRequest
  | GetChannelsRequest;

export type Response =
  | CreateChannelResponse
  | JoinChannelResponse
  | UpdateChannelResponse
  | GetWalletInformationResponse
  | EnableEthereumResponse
  | GetStateResponse
  | PushMessageResponse
  | ChallengeChannelResponse
  | GetBudgetResponse
  | CloseChannelResponse
  | ApproveBudgetAndFundResponse
  | CloseAndWithdrawResponse
  | GetChannelsResponse;

export type ErrorResponse =
  | EnableEthereumError
  | CloseAndWithdrawError
  | CloseChannelError
  | UpdateChannelError
  | GenericError;

export type JsonRpcMessage = Request | Response | Notification | ErrorResponse;

export function isResponse(message: JsonRpcMessage): message is Response {
  return 'id' in message && 'result' in message;
}

export function isNotification(message: JsonRpcMessage): message is Notification {
  return !('id' in message);
}
export function isRequest(message: JsonRpcMessage): message is Request {
  return 'id' in message && 'params' in message;
}

export function isError(message: JsonRpcMessage): message is ErrorResponse {
  return 'id' in message && 'error' in message;
}

export * from './notifications';
export * from './methods';
export * from './data-types';
export * from './error-codes';
