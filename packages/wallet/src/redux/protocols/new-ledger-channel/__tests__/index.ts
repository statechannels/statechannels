import { happyPath, ledgerFundingFails, successState as scenarioSuccessState } from './scenarios';

export const initialState = happyPath.waitForPreFundL1.state;

export const successState = scenarioSuccessState;
export const preSuccessState = happyPath.waitForPostFund1;
export const successTrigger = happyPath.waitForPostFund1.action;

export const preFailureState = ledgerFundingFails.waitForDirectFunding.state;
export const failureTrigger = ledgerFundingFails.waitForDirectFunding.action;
