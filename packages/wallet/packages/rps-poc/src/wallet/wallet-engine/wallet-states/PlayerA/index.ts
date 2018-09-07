import WaitForBlockchainDeploy from './WaitForBlockchainDeploy';
import ReadyToDeploy from './ReadyToDeploy';
import WaitForBToDeposit from './WaitForBToDeposit';
import Funded from './Funded';
import WaitForApproval from './WaitForApproval';

export type PlayerAState = (
  WaitForBlockchainDeploy |
  ReadyToDeploy |
  WaitForBToDeposit |
  WaitForApproval|
  Funded
);

export {WaitForBlockchainDeploy};
export {ReadyToDeploy};
export {WaitForBToDeposit};
export {Funded};
export {WaitForApproval};