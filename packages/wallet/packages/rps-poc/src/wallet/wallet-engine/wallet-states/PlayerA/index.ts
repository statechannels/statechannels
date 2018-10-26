import * as CommonState from '../';

export class ReadyToDeploy extends CommonState.FundingUnderway { }
export class WaitForBlockchainDeploy extends CommonState.FundingUnderway { }
export class WaitForBToDeposit extends CommonState.AdjudicatorReceived { }

export const FundingFailed = CommonState.FundingFailed;
export const WaitForApproval = CommonState.WaitForApproval;
export const Funded = CommonState.Funded;
export const SelectWithdrawalAddress = CommonState.SelectWithdrawalAddress;
export const WaitForWithdrawal = CommonState.WaitForWithdrawal;

export const ChallengeRequested = CommonState.ChallengeRequested;
export const ChallengeResponse = CommonState.ChallengeResponse;
export const ChallengeTimeout = CommonState.ChallengeTimeout;
export type PlayerAState =
  | ReadyToDeploy
  | WaitForBlockchainDeploy
  | typeof WaitForApproval
  | typeof FundingFailed
  | WaitForBToDeposit
  | typeof Funded
  |  CommonState.SelectWithdrawalAddress
  | typeof WaitForWithdrawal
  | typeof ChallengeRequested
  | typeof ChallengeResponse
  | typeof ChallengeTimeout;
