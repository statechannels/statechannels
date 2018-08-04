import ReadyToSendPreFundSetupB from './ReadyToSendPreFundSetupB';
import WaitForAToDeploy from './WaitForAToDeploy';
import ReadyToDeposit from './ReadyToDeposit';
import WaitForBlockchainDeposit from './WaitForBlockchainDeposit';
import WaitForPostFundSetupA from './WaitForPostFundSetupA';
import ReadyToSendPostFundSetupB from './ReadyToSendPostFundSetupB';
import WaitForPropose from './WaitForPropose';
import ReadyToChooseBPlay from './ReadyToChooseBPlay';
import ReadyToSendAccept from './ReadyToSendAccept';
import WaitForReveal from './WaitForReveal';
import ReadyToSendResting from './ReadyToSendResting';
import ReadyToSendConcludeB from './ReadyToSendConcludeB';
import WaitForConcludeB from './WaitForConcludeB';

export type PlayerBState = (
  ReadyToSendPreFundSetupB |
  WaitForAToDeploy |
  ReadyToDeposit |
  WaitForBlockchainDeposit |
  WaitForPostFundSetupA |
  ReadyToSendPostFundSetupB |
  WaitForPropose |
  ReadyToChooseBPlay |
  ReadyToSendAccept |
  WaitForReveal |
  ReadyToSendResting |
  ReadyToSendConcludeB |
  WaitForConcludeB 
);

export { ReadyToSendPreFundSetupB };
export { WaitForAToDeploy };
export { ReadyToDeposit };
export { WaitForBlockchainDeposit };
export { WaitForPostFundSetupA };
export { ReadyToSendPostFundSetupB };
export { WaitForPropose };
export { ReadyToChooseBPlay };
export { ReadyToSendAccept };
export { WaitForReveal };
export { ReadyToSendResting };
export { ReadyToSendConcludeB };
export { WaitForConcludeB };
