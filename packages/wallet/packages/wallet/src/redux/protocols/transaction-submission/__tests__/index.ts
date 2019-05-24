import { happyPath, transactionFailed } from './scenarios';

export const initialState = happyPath.waitForSend;

export const preSuccessState = happyPath.waitForConfirmation.state;
export const successTrigger = happyPath.waitForConfirmation.action;

export const preFailureState = transactionFailed.waitForConfirmation.state;
export const failureTrigger = transactionFailed.waitForConfirmation.action;
