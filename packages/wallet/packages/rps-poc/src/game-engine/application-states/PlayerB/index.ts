import ReadyToSendPreFundSetupB from './ReadyToSendPreFundSetupB';

import WaitForPostFundSetupA from './WaitForPostFundSetupA';
import ReadyToSendPostFundSetupB from './ReadyToSendPostFundSetupB';
import WaitForPropose from './WaitForPropose';
import ReadyToChooseBPlay from './ReadyToChooseBPlay';
import ReadyToSendAccept from './ReadyToSendAccept';
import WaitForReveal from './WaitForReveal';
import ReadyToSendResting from './ReadyToSendResting';
import ReadyToSendConcludeB from './ReadyToSendConcludeB';
import WaitForConcludeB from './WaitForConcludeB';
import WaitForFunding from './WaitForFunding';
import ReadyForFunding from './ReadyForFunding';

export type PlayerBState =
  | ReadyToSendPreFundSetupB
  | WaitForPostFundSetupA
  | ReadyToSendPostFundSetupB
  | WaitForPropose
  | ReadyToChooseBPlay
  | ReadyToSendAccept
  | WaitForReveal
  | ReadyToSendResting
  | ReadyToSendConcludeB
  | WaitForConcludeB
  | WaitForFunding
  | ReadyForFunding;

export { ReadyToSendPreFundSetupB };
export { WaitForPostFundSetupA };
export { ReadyToSendPostFundSetupB };
export { WaitForPropose };
export { ReadyToChooseBPlay };
export { ReadyToSendAccept };
export { WaitForReveal };
export { ReadyToSendResting };
export { ReadyToSendConcludeB };
export { WaitForConcludeB };
export { WaitForFunding };
export { ReadyForFunding };
