import * as CommonState from '..';

export class WaitForApprovalWithAdjudicator extends CommonState.WaitForApproval {
  adjudicatorAddress: string;
  constructor({ adjudicatorAddress, myAddress, opponentAddress, myBalance, opponentBalance }) {
    super({ myAddress, opponentAddress, myBalance, opponentBalance });
    this.adjudicatorAddress = adjudicatorAddress;
  }
}
export class WaitForAToDeploy extends CommonState.FundingUnderway { }
export class WaitForBlockchainDeposit extends CommonState.FundingUnderway { }
export const FundingFailed = CommonState.FundingFailed;
export const WaitForApproval = CommonState.WaitForApproval;
export const Funded = CommonState.Funded;
export class ReadyToDeposit extends CommonState.AdjudicatorReceived { }
export const WaitForWithdrawal = CommonState.WaitForWithdrawal;
export const SelectWithdrawalAddress = CommonState.SelectWithdrawalAddress;
export const ChallengeRequested = CommonState.ChallengeRequested;
export const ChallengeResponse = CommonState.ChallengeResponse;
export const ChallengeTimeout = CommonState.ChallengeTimeout;
export type PlayerBState =
  | ReadyToDeposit
  | WaitForBlockchainDeposit
  | WaitForAToDeploy
  | typeof WaitForApproval
  | typeof FundingFailed
  | ReadyToDeposit
  | typeof Funded
  | CommonState.SelectWithdrawalAddress
  | typeof WaitForWithdrawal
  | typeof ChallengeRequested
  | typeof ChallengeResponse
  | typeof ChallengeTimeout;
