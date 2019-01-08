import React from 'react';
import { storiesOf } from '@storybook/react';
import Wallet from '../containers/Wallet';
import { Provider } from 'react-redux';
import * as states from '../states';

import { scenarios } from '../../core';
import '../../index.scss';


const {
  asAddress,
  channelId,
  asPrivateKey,
  preFundSetupAHex,
  preFundSetupBHex,
  channelNonce,
  libraryAddress,
  participants,
} = scenarios.standard;

const defaults = {
  address: asAddress,
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  privateKey: asPrivateKey,
  uid: 'uid',
  penultimatePosition: { data: preFundSetupAHex, signature: 'fake-sig' },
  lastPosition: { data: preFundSetupBHex, signature: 'fake-sig' },
  turnNum: 1,
  networkId: 123,
  challengeExpiry: 0,
};
const playerADefaults = {
  ...defaults,
  ourIndex: 0,

};
const playerBDefaults = {
  ...defaults,
  ourIndex: 1,
};

const fakeStore = (state) => ({
  dispatch: action => {
    alert(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => ({ wallet: state }),
  subscribe: () => (() => {/* empty */ }),
  replaceReducer: () => { /* empty */ },
});

const testState = (state) => (
  () => (
    <Provider store={fakeStore(state)}>
      <Wallet children={<div />} />
    </Provider>
  )
);

storiesOf('Wallet Screens / Funding / Player A', module)
  .add('ApproveFunding', testState(states.approveFunding(playerADefaults)))
  .add('AWaitForDeployToBeSentToMetaMask', testState(states.aWaitForDeployToBeSentToMetaMask(playerADefaults)))
  .add('ASubmitDeployInMetaMask', testState(states.aSubmitDeployInMetaMask(playerADefaults)))
  .add('WaitForDeployConfirmation', testState(states.waitForDeployConfirmation(playerADefaults)))
  .add('WaitForDepositConfirmation', testState(states.waitForDepositConfirmation(playerADefaults)))
  .add('AWaitForPostFundSetup', testState(states.aWaitForPostFundSetup(playerADefaults)))
  .add('AcknowledgeFundingSuccess', testState(states.acknowledgeFundingSuccess(playerADefaults)));

storiesOf('Wallet Screens / Funding / Player B', module)
  .add('ApproveFunding', testState(states.approveFunding(playerBDefaults)))
  .add('BWaitForDeployAddress', testState(states.bWaitForDeployAddress(playerBDefaults)))
  .add('WaitForDeployConfirmation', testState(states.waitForDeployConfirmation(playerBDefaults)))
  .add('WaitForDepositConfirmation', testState(states.waitForDepositConfirmation(playerBDefaults)))
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
  .add('AcknowledgeChallenge', testState(states.acknowledgeChallenge(playerADefaults)))
  .add('ChooseResponse', testState(states.chooseResponse(playerADefaults)))
  .add('TakeMoveInApp', testState(states.takeMoveInApp(playerADefaults)))
  .add('InitiateResponse', testState(states.initiateResponse(playerADefaults)))
  .add('WaitForResponseSubmission', testState(states.waitForResponseSubmission(playerADefaults)))
  .add('AcknowledgeChallengeComplete', testState(states.acknowledgeChallengeComplete(playerADefaults)));

storiesOf('Wallet Screens / Closing', module)
  .add('ApproveConclude', testState(states.approveConclude(playerADefaults)))
  .add('WaitForOpponentConclude', testState(states.waitForOpponentConclude(playerADefaults)))
  .add('AcknowledgeConcludeSuccess', testState(states.approveCloseOnChain(playerADefaults)));
