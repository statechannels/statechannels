import ReadyToSendPreFundSetupA from './ReadyToSendPreFundSetupA';
import WaitForPreFundSetupB from './WaitForPreFundSetupB';
import WaitForFunding from './WaitForFunding';
import ReadyToSendPostFundSetupA from './ReadyToSendPostFundSetupA';
import WaitForPostFundSetupB from './WaitForPostFundSetupB';
import ReadyToChooseAPlay from './ReadyToChooseAPlay';
import ReadyToSendPropose from './ReadyToSendPropose';
import WaitForAccept from './WaitForAccept';
import ReadyToSendReveal from './ReadyToSendReveal';
import WaitForResting from './WaitForResting';
import ReadyToSendConcludeA from './ReadyToSendConcludeA';
import WaitForConcludeA from './WaitForConcludeA';
import ReadyToFund from './ReadyToFund'
import InsufficientFundsA from './InsufficientFundsA';
import InsufficientFundsB from './InsufficientFundsB';
type InsufficientFunds = InsufficientFundsA | InsufficientFundsB;

export type PlayerAState = (
  ReadyToSendPreFundSetupA |
  WaitForPreFundSetupB |
  WaitForFunding |
  ReadyToSendPostFundSetupA |
  WaitForPostFundSetupB |
  ReadyToChooseAPlay |
  ReadyToSendPropose |
  WaitForAccept |
  ReadyToSendReveal |
  WaitForResting |
  ReadyToSendConcludeA |
  WaitForConcludeA | 
  ReadyToFund |
  InsufficientFunds
);

export { ReadyToSendPreFundSetupA };
export { WaitForPreFundSetupB };
export { WaitForFunding };
export { ReadyToSendPostFundSetupA };
export { WaitForPostFundSetupB };
export { ReadyToChooseAPlay };
export { ReadyToSendPropose };
export { WaitForAccept };
export { ReadyToSendReveal };
export { WaitForResting };
export { ReadyToSendConcludeA };
export { WaitForConcludeA };
export {ReadyToFund};
export { InsufficientFundsA };
export { InsufficientFundsB };
export { InsufficientFunds };
