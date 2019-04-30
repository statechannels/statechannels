import { directlyFundingChannelHappyPath, directlyFundingFailure } from './scenarios';

export const preSuccessState = directlyFundingChannelHappyPath.waitForWithdrawal;
export const successTrigger = directlyFundingChannelHappyPath.withdrawalSuccessAction;

export const preFailureState = directlyFundingFailure.waitForWithdrawal;
export const failureTrigger = directlyFundingFailure.withdrawalFailureAction;
