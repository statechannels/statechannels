import * as CommonState from '..';

export type ReadyToDeposit = CommonState.AdjudicatorReceived;
export class WaitForAToDeploy { }
export class WaitForBlockchainDeposit { }
export class WaitForApprovalWithAdjudicator extends CommonState.WaitForApproval {
  adjudicatorAddress: string;
  constructor({ adjudicatorAddress, myAddress, opponentAddress, myBalance, opponentBalance }) {
    super({ myAddress, opponentAddress, myBalance, opponentBalance });
    this.adjudicatorAddress = adjudicatorAddress;
  }
}
export const FundingFailed = CommonState.FundingFailed;
export const WaitForApproval = CommonState.WaitForApproval;
export const Funded = CommonState.Funded;
export const ReadyToDeposit = CommonState.AdjudicatorReceived;
export const WaitForWithdrawal = CommonState.WaitForWithdrawal;
export const SelectWithdrawalAddress = CommonState.SelectWithdrawalAddress;
export const ChallengeRequested = CommonState.ChallengeRequested;
export const ChallengeResponse = CommonState.ChallengeResponse;
export const ChallengeTimeout = CommonState.ChallengeTimeout;
export type PlayerBState =
  | ReadyToDeposit
  | WaitForAToDeploy
  | WaitForBlockchainDeposit
  | typeof WaitForApproval
  | typeof FundingFailed
  | ReadyToDeposit
  | typeof Funded
  | typeof SelectWithdrawalAddress
  | typeof WaitForWithdrawal
  | typeof ChallengeRequested
  | typeof ChallengeResponse
  | typeof ChallengeTimeout;
