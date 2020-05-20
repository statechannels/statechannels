import {
  GetWalletInformationRequest,
  GetWalletInformationResponse
} from './methods/GetWalletInformationRequest';

import {
  EnableEthereumRequest,
  EnableEthereumResponse,
  EnableEthereumError
} from './methods/EnableEthereumRequest';

import {CreateChannelRequest, CreateChannelResponse} from './methods/CreateChannelRequest';
import {JoinChannelRequest, JoinChannelResponse} from './methods/JoinChannelRequest';
import {UpdateChannelRequest, UpdateChannelResponse} from './methods/UpdateChannelRequest';
import {GetStateRequest, GetStateResponse} from './methods/GetStateRequest';
import {PushMessageRequest, PushMessageResponse} from './methods/PushMessageRequest';

import {
  CloseChannelRequest,
  CloseChannelResponse,
  NotYourTurnError
} from './methods/CloseChannelRequest';

import {ChallengeChannelRequest, ChallengeChannelResponse} from './methods/ChallengeChannelRequest';

import {GetChannelsRequest, GetChannelsResponse} from './methods/GetChannelsRequest';

import {GetBudgetRequest, GetBudgetResponse} from './methods/GetBudgetRequest';

import {
  ApproveBudgetAndFundRequest,
  ApproveBudgetAndFundResponse
} from './methods/ApproveBudgetAndFundRequest';
import {
  CloseAndWithdrawRequest,
  CloseAndWithdrawResponse,
  UserDeclinedErrorResponse
} from './methods/CloseAndWithdrawParams';

import {Notification} from './notifications';

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

export type ErrorResponse = EnableEthereumError | UserDeclinedErrorResponse | NotYourTurnError;

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

export {EthereumNotEnabledErrorCode, UserDeclinedErrorCode} from './utils';
