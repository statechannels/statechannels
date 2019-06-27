import { happyPath, ledgerFundingFails, successState as scenarioSuccessState } from './scenarios';

export const initialState = happyPath.waitForPreFundSetup0.state;
export const successState = scenarioSuccessState;
export const preSuccessState = happyPath.waitForPostFund0.state;
export const successTrigger = happyPath.waitForPostFund0.action;

export const preFailureState = ledgerFundingFails.waitForDirectFunding.state;
export const failureTrigger = ledgerFundingFails.waitForDirectFunding.action;
