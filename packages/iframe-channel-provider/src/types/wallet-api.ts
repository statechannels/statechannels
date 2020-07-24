import {
  CreateChannelResponse,
  CreateChannelRequest,
  CloseChannelResponse,
  CloseChannelRequest,
  UpdateChannelResponse,
  UpdateChannelRequest,
  PushMessageResponse,
  PushMessageRequest,
  JoinChannelResponse,
  JoinChannelRequest,
  GetStateResponse,
  GetStateRequest,
  GetWalletInformationRequest,
  GetWalletInformationResponse,
  EnableEthereumRequest,
  EnableEthereumResponse,
  ChallengeChannelResponse,
  ChallengeChannelRequest,
  GetBudgetResponse,
  GetBudgetRequest,
  ApproveBudgetAndFundResponse,
  ApproveBudgetAndFundRequest,
  GetChannelsRequest,
  GetChannelsResponse,
  CloseAndWithdrawRequest,
  CloseAndWithdrawResponse
} from '@statechannels/client-api-schema';

export type WalletJsonRpcAPI = {
  CreateChannel: {
    request: CreateChannelRequest;
    response: CreateChannelResponse;
  };
  UpdateChannel: {
    request: UpdateChannelRequest;
    response: UpdateChannelResponse;
  };
  PushMessage: {
    request: PushMessageRequest;
    response: PushMessageResponse;
  };
  CloseChannel: {
    request: CloseChannelRequest;
    response: CloseChannelResponse;
  };
  JoinChannel: {
    request: JoinChannelRequest;
    response: JoinChannelResponse;
  };
  GetState: {
    request: GetStateRequest;
    response: GetStateResponse;
  };
  GetWalletInformation: {
    request: GetWalletInformationRequest;
    response: GetWalletInformationResponse;
  };
  EnableEthereum: {
    request: EnableEthereumRequest;
    response: EnableEthereumResponse;
  };
  ChallengeChannel: {
    request: ChallengeChannelRequest;
    response: ChallengeChannelResponse;
  };
  ApproveBudgetAndFund: {
    request: ApproveBudgetAndFundRequest;
    response: ApproveBudgetAndFundResponse;
  };
  GetBudget: {
    request: GetBudgetRequest;
    response: GetBudgetResponse;
  };
  CloseAndWithdraw: {
    request: CloseAndWithdrawRequest;
    response: CloseAndWithdrawResponse;
  };
  GetChannels: {
    request: GetChannelsRequest;
    response: GetChannelsResponse;
  };
};
