import {
  aDepositsBDepositsAHappyStates,
  actions,
  aDepositsBDepositsBHappyStates,
  transactionFails,
} from './scenarios';

export const preSuccessStateA = aDepositsBDepositsAHappyStates.waitForPostFundSetup;
export const successTriggerA = actions.postFundSetup1;

export const preSuccessStateB = aDepositsBDepositsBHappyStates.waitForPostFundSetup;
export const successTriggerB = actions.postFundSetup0;

export const preFailureState = transactionFails.waitForDepositTransaction;
export const failureTrigger = transactionFails.failureTrigger;
