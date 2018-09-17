import * as CommonState from '../';

export class ReadyToDeploy {}
export class WaitForBlockchainDeploy {}
export const WaitForBToDeposit  = CommonState.AdjudicatorReceived;
export const FundingFailed = CommonState.FundingFailed;
export const WaitForApproval = CommonState.WaitForApproval;
export const Funded = CommonState.Funded;
export type WaitForBToDeposit = CommonState.AdjudicatorReceived;
export type PlayerAState =
  | ReadyToDeploy
  | WaitForBlockchainDeploy
  | WaitForBToDeposit
  | CommonState.WaitForApproval
  | CommonState.FundingFailed
  | CommonState.AdjudicatorReceived
  |CommonState.Funded;
