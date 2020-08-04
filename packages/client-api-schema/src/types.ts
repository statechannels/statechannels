import {StateChannelsNotification} from './notifications';
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

export type StateChannelsRequest =
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

export type StateChannelsResponse =
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

export type StateChannelsErrorResponse =
  | EnableEthereumError
  | CloseAndWithdrawError
  | CloseChannelError
  | UpdateChannelError
  | GenericError;

export type StateChannelsJsonRpcMessage =
  | StateChannelsRequest
  | StateChannelsResponse
  | StateChannelsNotification
  | StateChannelsErrorResponse;

export function isStateChannelsResponse(
  message: StateChannelsJsonRpcMessage
): message is StateChannelsResponse {
  return 'id' in message && 'result' in message;
}

export function isStateChannelsNotification(
  message: StateChannelsJsonRpcMessage
): message is StateChannelsNotification {
  return !('id' in message);
}
export function isStateChannelsRequest(
  message: StateChannelsJsonRpcMessage
): message is StateChannelsRequest {
  return 'id' in message && 'params' in message;
}

export function isStateChannelsErrorResponse(
  message: StateChannelsJsonRpcMessage
): message is StateChannelsErrorResponse {
  return 'id' in message && 'message' in message && 'error' in message;
}

export * from './notifications';
export * from './methods';
export * from './data-types';
export * from './error-codes';
