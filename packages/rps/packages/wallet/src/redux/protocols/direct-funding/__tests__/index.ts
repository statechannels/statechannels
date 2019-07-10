import { aHappyPath, bHappyPath, transactionFails } from './scenarios';

export const preSuccessA = aHappyPath.waitForFunding;
export const preSuccessB = bHappyPath.waitForFunding;

export const preFailure = transactionFails.waitForDepositTransaction;
