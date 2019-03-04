import React from 'react';
import { storiesOf } from '@storybook/react';
import Wallet from '../containers/Wallet';
import { Provider } from 'react-redux';
import * as states from '../states';
import '../index.scss';
import * as scenarios from '../redux/reducers/__tests__/test-scenarios';
import { bigNumberify } from 'ethers/utils';

const {
  asAddress,
  channelId,
  asPrivateKey,
  channelNonce,
  libraryAddress,
  participants,
  preFundCommitment1,
  preFundCommitment2,
} = scenarios;

const defaults = {
  address: asAddress,
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  privateKey: asPrivateKey,
  uid: 'uid',
  lastCommitment: { commitment: preFundCommitment2, signature: 'fake-sig' },
  penultimateCommitment: { commitment: preFundCommitment1, signature: 'fake-sig' },
  turnNum: preFundCommitment2.turnNum,
  networkId: 3,
  challengeExpiry: 0,
  transactionHash: '0x0',
  userAddress: '0x0',
  requestedTotalFunds: bigNumberify(1000000000000000).toHexString(),
};
const playerADefaults = {
  ...defaults,
  ourIndex: 0,
  requestedYourDeposit: bigNumberify(500000000000000).toHexString(),
};
const playerBDefaults = {
  ...defaults,
  ourIndex: 1,
  requestedYourDeposit: bigNumberify(500000000000000).toHexString(),
};

const fakeStore = (state) => ({
  dispatch: action => {
    alert(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => (state),
  subscribe: () => (() => {/* empty */ }),
  replaceReducer: () => { /* empty */ },
});

const testState = (state) => (
  () => (
    <Provider store={fakeStore(state)}>
      <Wallet />
    </Provider>
  )
);

storiesOf('Network Status', module)
  .add('Mainnet', testState(states.approveFunding({ ...playerADefaults, networkId: 1 })))
  .add('Kovan', testState(states.approveFunding({ ...playerADefaults, networkId: 4 })))
  .add('Ropsten', testState(states.approveFunding({ ...playerADefaults, networkId: 3 })))
  .add('Rinkeby', testState(states.approveFunding({ ...playerADefaults, networkId: 42 })))
  .add('Ganache', testState(states.approveFunding({ ...playerADefaults, networkId: 5777 })));
storiesOf('Wallet Screens / Funding / Player A', module)
  .add('ApproveFunding', testState(states.approveFunding(playerADefaults)))
  .add('AWaitForDepositToBeSentToMetaMask', testState(states.aWaitForDepositToBeSentToMetaMask(playerADefaults)))
  .add('ASubmitDepositInMetaMask', testState(states.aSubmitDepositInMetaMask(playerADefaults)))
  .add('AWaitForDepositConfirmation', testState(states.aWaitForDepositConfirmation(playerADefaults)))
  .add('AWaitForOpponentDeposit', testState(states.aWaitForOpponentDeposit(playerADefaults)))
  .add('AWaitForPostFundSetup', testState(states.aWaitForPostFundSetup(playerADefaults)))
  .add('AcknowledgeFundingSuccess', testState(states.acknowledgeFundingSuccess(playerADefaults)));

storiesOf('Wallet Screens / Funding / Player B', module)
  .add('ApproveFunding', testState(states.approveFunding(playerBDefaults)))
  .add('BWaitForOpponentDeposit', testState(states.bWaitForOpponentDeposit(playerBDefaults)))
  .add('BWaitForDepositToBeSentToMetaMask', testState(states.bWaitForDepositToBeSentToMetaMask(playerBDefaults)))
  .add('BSubmitDepositInMetaMask', testState(states.bSubmitDepositInMetaMask(playerBDefaults)))
  .add('BWaitForDepositConfirmation', testState(states.bWaitForDepositConfirmation(playerBDefaults)))
  .add('BWaitForPostFundSetup', testState(states.bWaitForPostFundSetup(playerBDefaults)))
  .add('AcknowledgeFundingSuccess', testState(states.acknowledgeFundingSuccess(playerBDefaults)));

storiesOf('Wallet Screens / Withdrawing', module)
  .add('ApproveWithdrawal', testState(states.approveWithdrawal(playerADefaults)))
  .add('WaitForWithdrawalInitiation', testState(states.waitForWithdrawalInitiation(playerADefaults)))
  .add('WaitForWithdrawalConfirmation', testState(states.waitForWithdrawalConfirmation(playerADefaults)))
  .add('AcknowledgeWithdrawalSuccess', testState(states.acknowledgeWithdrawalSuccess(playerADefaults)));

storiesOf('Wallet Screens / Challenging', module)
  .add('ApproveChallenge', testState(states.approveChallenge(playerADefaults)))
  .add('WaitForChallengeInitiation', testState(states.waitForChallengeInitiation({}, playerADefaults)))
  .add('WaitForChallengeSubmission', testState(states.waitForChallengeSubmission(playerADefaults)))
  .add('WaitForChallengeConfirmation', testState(states.waitForChallengeConfirmation(playerADefaults)))
  .add('WaitForResponseOrTimeout', testState(states.waitForResponseOrTimeout(playerADefaults)))
  .add('AcknowledgeChallengeResponse', testState(states.acknowledgeChallengeResponse(playerADefaults)))
  .add('AcknowledgeChallengeTimeout', testState(states.acknowledgeChallengeTimeout(playerADefaults)));

storiesOf('Wallet Screens / Responding', module)
  .add('ChooseResponse', testState(states.chooseResponse(playerADefaults)))
  .add('AcknowledgeChallengeTimeout', testState(states.challengeeAcknowledgeChallengeTimeOut(playerADefaults)))
  .add('TakeMoveInApp', testState(states.takeMoveInApp(playerADefaults)))
  .add('InitiateResponse', testState(states.initiateResponse(playerADefaults)))
  .add('WaitForResponseSubmission', testState(states.waitForResponseSubmission(playerADefaults)))
  .add('WaitForResponseConfirmation', testState(states.waitForResponseConfirmation(playerADefaults)))
  .add('AcknowledgeChallengeComplete', testState(states.acknowledgeChallengeComplete(playerADefaults)));

storiesOf('Wallet Screens / Closing', module)
  .add('ApproveConclude', testState(states.approveConclude(playerADefaults)))
  .add('WaitForOpponentConclude', testState(states.waitForOpponentConclude(playerADefaults)))
  .add('AcknowledgeConcludeSuccess', testState(states.approveCloseOnChain(playerADefaults)));

storiesOf('Wallet Landing Page', module)
  .add('Landing Page', testState(states.waitForLogin({})));
