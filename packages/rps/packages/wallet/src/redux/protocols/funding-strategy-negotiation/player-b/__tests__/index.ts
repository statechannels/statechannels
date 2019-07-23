import { indirectStrategyChosen, virtualStrategyChosen } from './scenarios';

export const indirectPreSuccess = indirectStrategyChosen.waitForStrategyApproval;
export const virtualPreSuccess = virtualStrategyChosen.waitForStrategyApproval;

export { virtualSuccess, indirectSuccess } from './scenarios';
