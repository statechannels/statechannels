import * as scenarios from './scenarios';
export const initialStore = scenarios.clearedToSendHappyPath.initialParams.sharedData;
export const preSuccessState = scenarios.clearedToSendHappyPath.waitForConclude;
export const successTrigger = scenarios.clearedToSendHappyPath.waitForConclude.action;
