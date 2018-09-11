import WaitForBlockchainDeposit from './WaitForBlockchainDeposit';
import ReadyToDeposit from './ReadyToDeposit';
import WaitForAToDeploy from './WaitForAToDeploy';
import Funded from './Funded';
import FundingFailed from './FundingFailed';

export type PlayerBState = (
  WaitForBlockchainDeposit |
  ReadyToDeposit |
  WaitForAToDeploy |
  Funded |
  FundingFailed
);

export {WaitForBlockchainDeposit};
export {ReadyToDeposit};
export {WaitForAToDeploy};
export {Funded};
export {FundingFailed};