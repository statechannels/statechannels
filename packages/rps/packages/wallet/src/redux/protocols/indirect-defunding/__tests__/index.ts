import * as scenarios from './scenarios';
export const initialStore = scenarios.playerAHappyPath.initialParams.sharedData;
export const preSuccessState = scenarios.playerAHappyPath.waitForConclude.state;
export const successTrigger = scenarios.playerAHappyPath.waitForConclude.action;
export const preFailureState = scenarios.playerAInvalidCommitment.waitForLedgerUpdate.state;
export const failureTrigger = scenarios.playerAInvalidCommitment.waitForLedgerUpdate.action;
