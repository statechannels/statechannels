import * as GetClientWalletInformation from './methods/GetWalletInformation';
import * as EnableEthereum from './methods/EnableEthereum';
import * as CreateChannel from './methods/CreateChannel';
import * as JoinChannel from './methods/JoinChannel';
import * as UpdateChannel from './methods/UpdateChannel';
import * as GetState from './methods/GetState';
import * as PushMessage from './methods/PushMessage';
import * as CloseChannel from './methods/CloseChannel';
import * as ChallengeChannel from './methods/ChallengeChannel';
import * as GetChannels from './methods/GetChannels';
import * as GetBudget from './methods/GetBudget';
import * as ApproveBudgetAndFund from './methods/ApproveBudgetAndFund';
import * as CloseAndWithdraw from './methods/CloseAndWithdraw';

import {Notification} from './notifications';

export type Request =
  | CreateChannel.CreateChannelRequest
  | JoinChannel.JoinChannelRequest
  | UpdateChannel.UpdateChannelRequest
  | GetClientWalletInformation.GetWalletInformationRequest
  | EnableEthereum.EnableEthereumRequest
  | GetState.GetStateRequest
  | PushMessage.PushMessageRequest
  | ChallengeChannel.ChallengeChannelRequest
  | GetBudget.GetBudgetRequest
  | ApproveBudgetAndFund.ApproveBudgetAndFundRequest
  | CloseChannel.CloseChannelRequest
  | CloseAndWithdraw.CloseAndWithdrawRequest
  | GetChannels.GetChannelsRequest;

export type Response =
  | CreateChannel.CreateChannelResponse
  | JoinChannel.JoinChannelResponse
  | UpdateChannel.UpdateChannelResponse
  | GetClientWalletInformation.GetWalletInformationResponse
  | EnableEthereum.EnableEthereumResponse
  | GetState.GetStateResponse
  | PushMessage.PushMessageResponse
  | ChallengeChannel.ChallengeChannelResponse
  | GetBudget.GetBudgetResponse
  | CloseChannel.CloseChannelResponse
  | ApproveBudgetAndFund.ApproveBudgetAndFundResponse
  | CloseAndWithdraw.CloseAndWithdrawResponse
  | GetChannels.GetChannelsResponse;

import {JsonRpcError} from './utils';
type GenericError = JsonRpcError<500, 'Wallet error'>;

export type ErrorResponse =
  | EnableEthereum.EnableEthereumError
  | CloseAndWithdraw.CloseAndWithdrawError
  | CloseChannel.CloseChannelError
  | UpdateChannel.UpdateChannelError
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
