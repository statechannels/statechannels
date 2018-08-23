import WaitForBlockchainDeploy from './WaitForBlockchainDeploy';
import ReadyToDeploy from './ReadyToDeploy';
import WaitForBToDeposit from './WaitForBToDeposit';
import Funded from './Funded';

export type PlayerAState = (
  WaitForBlockchainDeploy |
  ReadyToDeploy |
  WaitForBToDeposit |
  Funded
);

export {WaitForBlockchainDeploy};
export {ReadyToDeploy};
export {WaitForBToDeposit};
export {Funded};