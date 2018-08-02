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

const PLAYER_INDEX = 0;
export { PLAYER_INDEX };

// TODO: make types an enum?
const types = Object.freeze({
  ReadyToSendPreFundSetupA: 'ReadyToSendPreFundSetupA',
  WaitForPreFundSetupB: 'WaitForPreFundSetupB',
  ReadyToDeploy: 'ReadyToDeploy',
  WaitForBlockchainDeploy: 'WaitForBlockchainDeploy',
  WaitForBToDeposit: 'WaitForBToDeposit',
  ReadyToSendPostFundSetupA: 'ReadyToSendPostFundSetupA',
  WaitForPostFundSetupB: 'WaitForPostFundSetupB',
  ReadyToChooseAPlay: 'ReadyToChooseAPlay',
  ReadyToSendPropose: 'ReadyToSendPropose',
  WaitForAccept: 'WaitForAccept',
  ReadyToSendReveal: 'ReadyToSendReveal',
  WaitForResting: 'WaitForResting',
  ReadyToSendConcludeA: 'ReadyToSendConcludeA',
  WaitForConcludeA: 'WaitForConcludeA',
});

export {
  types,
  ReadyToSendPreFundSetupA,
  WaitForPreFundSetupB,
  ReadyToDeploy,
  WaitForBlockchainDeploy,
  WaitForBToDeposit,
  ReadyToSendPostFundSetupA,
  WaitForPostFundSetupB,
  ReadyToChooseAPlay,
  ReadyToSendPropose,
  WaitForAccept,
  ReadyToSendReveal,
  WaitForResting,
  ReadyToSendConcludeA,
  WaitForConcludeA,
};
