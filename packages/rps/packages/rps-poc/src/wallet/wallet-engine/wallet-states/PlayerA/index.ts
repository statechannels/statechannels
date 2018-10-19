import * as CommonState from '../';

export class ReadyToDeploy { }
export class WaitForBlockchainDeploy { }
export const WaitForBToDeposit = CommonState.AdjudicatorReceived;

export const FundingFailed = CommonState.FundingFailed;
export const WaitForApproval = CommonState.WaitForApproval;
export const Funded = CommonState.Funded;
export const SelectWithdrawalAddress = CommonState.SelectWithdrawalAddress;
export const WaitForWithdrawal = CommonState.WaitForWithdrawal;

export const ChallengeRequested = CommonState.ChallengeRequested;
export const ChallengeResponse = CommonState.ChallengeResponse;
export const ChallengeTimeout = CommonState.ChallengeTimeout;
export type WaitForBToDeposit = CommonState.AdjudicatorReceived;
export type PlayerAState =
  | ReadyToDeploy
  | WaitForBlockchainDeploy
  | WaitForBToDeposit
  | typeof WaitForApproval
  | typeof FundingFailed
  | WaitForBToDeposit
  | typeof Funded
  | typeof SelectWithdrawalAddress
  | typeof WaitForWithdrawal
  | typeof ChallengeRequested
  | typeof ChallengeResponse
  | typeof ChallengeTimeout;
