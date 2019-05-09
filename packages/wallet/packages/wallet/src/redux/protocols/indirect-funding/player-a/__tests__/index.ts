import { happyPath, ledgerFundingFails } from './scenarios';

export const initialState = happyPath.waitForPreFundL1.state;

export const successState = happyPath.success.state;
export const preSuccessState = happyPath.waitForPostFund1.state;
export const successTrigger = happyPath.waitForPostFund1.action;

export const preFailureState = ledgerFundingFails.waitForDirectFunding.state;
export const failureTrigger = ledgerFundingFails.waitForDirectFunding.action;
