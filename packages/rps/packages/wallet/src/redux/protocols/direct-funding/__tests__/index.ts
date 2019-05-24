import { aHappyPath, bHappyPath, transactionFails } from './scenarios';

export const preSuccessA = aHappyPath.waitForPostFundSetup;

export const preSuccessB = bHappyPath.waitForPostFundSetup;

export const preFailure = transactionFails.waitForDepositTransaction;
