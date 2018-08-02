import BaseState from '../ApplicationStates';
import ReadyToSendConclude from '../ReadyToSendConclude';
import WaitForConclude from '../WaitForConclude';

const PLAYER_INDEX = 0;
export { PLAYER_INDEX };


const types = Object.freeze({
  ReadyToSendPreFundSetup0: 'ReadyToSendPreFundSetup0',
  WaitForPreFundSetup1: 'WaitForPreFundSetup1',
  ReadyToDeploy: 'ReadyToDeploy',
  WaitForBlockchainDeploy: 'WaitForBlockchainDeploy',
  WaitForBToDeposit: 'WaitForBToDeposit',
  ReadyToSendPostFundSetup0: 'ReadyToSendPostFundSetup0',
  WaitForPostFundSetup1: 'WaitForPostFundSetup1',
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
  ReadyToSendPreFundSetup0,
  WaitForPreFundSetup1,
  ReadyToDeploy,
  WaitForBlockchainDeploy,
  WaitForBToDeposit,
  ReadyToSendPostFundSetup0,
  WaitForPostFundSetup1,
  ReadyToChooseAPlay,
  ReadyToSendPropose,
  WaitForAccept,
  ReadyToSendReveal,
  WaitForResting,
  ReadyToSendConcludeA,
  WaitForConcludeA,
};
