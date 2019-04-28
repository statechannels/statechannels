import {
  aEachDepositsInSequenceHappyStates,
  actions,
  bEachDepositsInSequenceHappyStates,
  transactionFails,
} from './scenarios';

export const preSuccessStateA = aEachDepositsInSequenceHappyStates.waitForPostFundSetup;
export const successTriggerA = actions.postFundSetup1;

export const preSuccessStateB = bEachDepositsInSequenceHappyStates.waitForPostFundSetup;
export const successTriggerB = actions.postFundSetup0;

export const preFailureState = transactionFails.waitForDepositTransaction;
export const failureTrigger = transactionFails.failureTrigger;
