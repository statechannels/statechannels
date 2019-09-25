import { indirectStrategyChosen, virtualStrategyChosen } from './scenarios';

export const indirectPreSuccess = indirectStrategyChosen.waitForStrategyResponse;
export const virtualPreSuccess = virtualStrategyChosen.waitForStrategyResponse;

export { virtualSuccess, indirectSuccess } from './scenarios';
