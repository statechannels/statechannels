import ReadyToSendPreFundSetupA from './ReadyToSendPreFundSetupA';
import WaitForPreFundSetupB from './WaitForPreFundSetupB';
import ReadyToDeploy from './ReadyToDeploy';
import WaitForBlockchainDeploy from './WaitForBlockchainDeploy';
import WaitForBToDeposit from './WaitForBToDeposit';
import ReadyToSendPostFundSetupA from './ReadyToSendPostFundSetupA';
import WaitForPostFundSetupB from './WaitForPostFundSetupB';
import ReadyToChooseAPlay from './ReadyToChooseAPlay';
import ReadyToSendPropose from './ReadyToSendPropose';
import WaitForAccept from './WaitForAccept';
import ReadyToSendReveal from './ReadyToSendReveal';
import WaitForResting from './WaitForResting';
import ReadyToSendConcludeA from './ReadyToSendConcludeA';
import WaitForConcludeA from './WaitForConcludeA';

export type PlayerAState = (
  ReadyToSendPreFundSetupA |
  WaitForPreFundSetupB |
  ReadyToDeploy |
  WaitForBlockchainDeploy |
  WaitForBToDeposit |
  ReadyToSendPostFundSetupA |
  WaitForPostFundSetupB |
  ReadyToChooseAPlay |
  ReadyToSendPropose |
  WaitForAccept |
  ReadyToSendReveal |
  WaitForResting |
  ReadyToSendConcludeA |
  WaitForConcludeA
);
  
export { ReadyToSendPreFundSetupA };
export { WaitForPreFundSetupB };
export { ReadyToDeploy };
export { WaitForBlockchainDeploy };
export { WaitForBToDeposit };
export { ReadyToSendPostFundSetupA };
export { WaitForPostFundSetupB };
export { ReadyToChooseAPlay };
export { ReadyToSendPropose };
export { WaitForAccept };
export { ReadyToSendReveal };
export { WaitForResting };
export { ReadyToSendConcludeA };
export { WaitForConcludeA };
