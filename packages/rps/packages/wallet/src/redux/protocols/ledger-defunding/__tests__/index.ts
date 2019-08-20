import * as scenarios from './scenarios';
export const initialStore = scenarios.clearedToSendHappyPath.initialParams.sharedData;
export const preSuccessState = scenarios.clearedToSendHappyPath.waitForLedgerUpdate;
export const successTrigger = scenarios.clearedToSendHappyPath.waitForLedgerUpdate.action;
