import WaitForBlockchainDeposit from './WaitForBlockchainDeposit';
import ReadyToDeposit from './ReadyToDeposit';
import WaitForAToDeploy from './WaitForAToDeploy';
import Funded from './Funded';

export type PlayerBState = (
  WaitForBlockchainDeposit |
  ReadyToDeposit |
  WaitForAToDeploy |
  Funded
);

export {WaitForBlockchainDeposit};
export {ReadyToDeposit};
export {WaitForAToDeploy};
export {Funded};