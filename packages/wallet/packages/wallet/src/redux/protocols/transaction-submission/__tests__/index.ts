import { happyPath, transactionFailed } from './scenarios';

export const initialState = happyPath.waitForSend;

export const preSuccessState = happyPath.waitForConfirmation;
export const successTrigger = happyPath.confirmed;

export const preFailureState = transactionFailed.waitForConfirmation;
export const failureTrigger = transactionFailed.failed;
