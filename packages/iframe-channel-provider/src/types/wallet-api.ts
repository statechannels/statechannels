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

/**
 * @beta
 */
export type WalletJsonRpcAPI = {
  /**
   * Requests a new channel to be created
   */
  CreateChannel: {
    request: CreateChannelRequest;
    response: CreateChannelResponse;
  };
  /**
   * Updates the state of a channel
   */
  UpdateChannel: {
    request: UpdateChannelRequest;
    response: UpdateChannelResponse;
  };
  /**
   * Accepts inbound messages from other state channel participants.
   */
  PushMessage: {
    request: PushMessageRequest;
    response: PushMessageResponse;
  };
  /**
   * Requests a close for a channel
   */
  CloseChannel: {
    request: CloseChannelRequest;
    response: CloseChannelResponse;
  };
  /**
   * Join a proposed state channel
   */
  JoinChannel: {
    request: JoinChannelRequest;
    response: JoinChannelResponse;
  };
  /**
   * Requests the latest state for a channel
   */
  GetState: {
    request: GetStateRequest;
    response: GetStateResponse;
  };
  /**
   * Requests basic information from the wallet
   */
  GetWalletInformation: {
    request: GetWalletInformationRequest;
    response: GetWalletInformationResponse;
  };
  EnableEthereum: {
    request: EnableEthereumRequest;
    response: EnableEthereumResponse;
  };
  /**
   * Requests a challenge for a channel
   */
  ChallengeChannel: {
    request: ChallengeChannelRequest;
    response: ChallengeChannelResponse;
  };
  /**
   * Requests approval for a new budget for this domain, as well as for an appropriately funded ledger channel with the hub
   */
  ApproveBudgetAndFund: {
    request: ApproveBudgetAndFundRequest;
    response: ApproveBudgetAndFundResponse;
  };
  /**
   * Requests the latest budget for this domain
   */
  GetBudget: {
    request: GetBudgetRequest;
    response: GetBudgetResponse;
  };
  /**
   * Requests the funds to be withdrawn from this domain's ledger channel
   */
  CloseAndWithdraw: {
    request: CloseAndWithdrawRequest;
    response: CloseAndWithdrawResponse;
  };
  /**
   * Requests the latest state for all channels.
   */
  GetChannels: {
    request: GetChannelsRequest;
    response: GetChannelsResponse;
  };
};
