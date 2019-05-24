import { directlyFundingChannelHappyPath, directlyFundingFailure } from './scenarios';

export const preSuccess = directlyFundingChannelHappyPath.waitForWithdrawal;

export const preFailure = directlyFundingFailure.waitForWithdrawal;
