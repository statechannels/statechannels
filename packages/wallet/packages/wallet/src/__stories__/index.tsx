import React from 'react';
import { storiesOf } from '@storybook/react';
import WalletContainer from '../containers/Wallet';
import { Provider } from 'react-redux';
import * as walletStates from '../redux/state';
import * as channelStates from '../redux/channelState/state';
import * as fundingStates from '../redux/channelState/fundingState/state';
import '../index.scss';
import * as scenarios from '../redux/__tests__/test-scenarios';
import { bigNumberify } from 'ethers/utils';
import NetworkStatus from '../components/NetworkStatus';
import { fundingConfirmed } from '../redux/channelState/fundingState/state';

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

const defaultFundingState: fundingStates.SharedFundingState = {
  fundingType: fundingStates.DIRECT_FUNDING,
  requestedTotalFunds: bigNumberify(1000000000000000).toHexString(),
  requestedYourContribution: bigNumberify(500000000000000).toHexString(),
  channelId: 'channel id',
};

const fundingStateWithTX = { ...defaultFundingState, transactionHash: 'TX_HASH' };

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
  funded: false,
};
const playerADefaults = {
  ...defaults,
  ourIndex: 0,
  fundingState: fundingConfirmed(defaultFundingState),
};
const playerBDefaults = {
  ...defaults,
  ourIndex: 1,
  fundingState: fundingConfirmed(defaultFundingState),
};

const fakeStore = state => ({
  dispatch: action => {
    alert(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => state,
  subscribe: () => () => {
    /* empty */
  },
  replaceReducer: () => {
    /* empty */
  },
});

const initializedWalletState = walletStates.channelInitialized({
  ...walletStates.waitForLogin(),
  unhandledAction: undefined,
  outboxState: {},
  channelState: channelStates.approveFunding({ ...playerADefaults }),
  networkId: 4,
  adjudicator: '',
  uid: '',
});

// Want to return top level wallet state, not the channel state
function walletStateFromChannelState<T extends channelStates.ChannelState>(
  channelState: T,
  networkId?: number,
): walletStates.WalletState {
  return {
    ...initializedWalletState,
    channelState: { ...channelState },
    networkId: networkId || 3,
  };
}

const channelStateRender = channelState => () => (
  <Provider store={fakeStore(walletStateFromChannelState(channelState))}>
    <WalletContainer />
  </Provider>
);

storiesOf('Network Status', module)
  .add('Mainnet', () => (
    <Provider store={fakeStore({ networkId: 1 })}>
      <NetworkStatus />
    </Provider>
  ))
  .add('Kovan', () => (
    <Provider store={fakeStore({ networkId: 42 })}>
      <NetworkStatus />
    </Provider>
  ))
  .add('Ropsten', () => (
    <Provider store={fakeStore({ networkId: 3 })}>
      <NetworkStatus />
    </Provider>
  ))
  .add('Rinkeby', () => (
    <Provider store={fakeStore({ networkId: 4 })}>
      <NetworkStatus />
    </Provider>
  ))
  .add('Ganache', () => (
    <Provider store={fakeStore({ networkId: 5777 })}>
      <NetworkStatus />
    </Provider>
  ));

function addStoriesFromCollection(collection, chapter) {
  Object.keys(collection).map(storyName => {
    storiesOf(chapter, module).add(storyName, channelStateRender(collection[storyName]));
  });
}

const WalletScreensFundingPlayerA = {
  ApproveFunding: channelStates.approveFunding(playerADefaults),
  AWaitForDepositToBeSentToMetaMask: channelStates.waitForFundingAndPostFundSetup({
    ...playerADefaults,
    fundingState: fundingStates.aWaitForDepositToBeSentToMetaMask(defaultFundingState),
  }),
  ASubmitDepositInMetaMask: channelStates.waitForFundingAndPostFundSetup({
    ...playerADefaults,
    fundingState: fundingStates.aSubmitDepositInMetaMask(defaultFundingState),
  }),
  AWaitForDepositConfirmation: channelStates.waitForFundingAndPostFundSetup({
    ...playerADefaults,
    fundingState: fundingStates.aWaitForDepositConfirmation(fundingStateWithTX),
  }),
  AWaitForOpponentDeposit: channelStates.waitForFundingAndPostFundSetup({
    ...playerADefaults,
    fundingState: fundingStates.aWaitForOpponentDeposit(defaultFundingState),
  }),
  AWaitForPostFundSetup: channelStates.aWaitForPostFundSetup(playerADefaults),
  AcknowledgeFundingSuccess: channelStates.acknowledgeFundingSuccess(playerADefaults),
};
addStoriesFromCollection(WalletScreensFundingPlayerA, 'Wallet Screens / Funding / Player A');

const WalletScreensFundingPlayerB = {
  ApproveFunding: channelStates.approveFunding(playerBDefaults),
  BWaitForOpponentDeposit: channelStates.waitForFundingAndPostFundSetup({
    ...playerBDefaults,
    fundingState: fundingStates.bWaitForOpponentDeposit(defaultFundingState),
  }),
  BWaitForDepositToBeSentToMetaMask: channelStates.waitForFundingAndPostFundSetup({
    ...playerBDefaults,
    fundingState: fundingStates.bWaitForDepositToBeSentToMetaMask(defaultFundingState),
  }),
  BSubmitDepositInMetaMask: channelStates.waitForFundingAndPostFundSetup({
    ...playerBDefaults,
    fundingState: fundingStates.bSubmitDepositInMetaMask(defaultFundingState),
  }),
  BWaitForDepositConfirmation: channelStates.waitForFundingAndPostFundSetup({
    ...playerBDefaults,
    fundingState: fundingStates.bWaitForDepositConfirmation(fundingStateWithTX),
  }),
  BWaitForPostFundSetup: channelStates.bWaitForPostFundSetup(playerBDefaults),
  AcknowledgeFundingSuccess: channelStates.acknowledgeFundingSuccess(playerBDefaults),
};
addStoriesFromCollection(WalletScreensFundingPlayerB, 'Wallet Screens / Funding / Player B');

const WalletScreendsWithdrawing = {
  ApproveWithdrawal: channelStates.approveWithdrawal(playerADefaults),
  WaitForWithdrawalInitiation: channelStates.waitForWithdrawalInitiation(playerADefaults),
  WaitForWithdrawalConfirmation: channelStates.waitForWithdrawalConfirmation(playerADefaults),
  AcknowledgeWithdrawalSuccess: channelStates.acknowledgeWithdrawalSuccess(playerADefaults),
};
addStoriesFromCollection(WalletScreendsWithdrawing, 'Wallet Screens / Withdrawing');

const WalletScreensChallenging = {
  ApproveChallenge: channelStates.approveChallenge(playerADefaults),
  WaitForChallengeInitiation: channelStates.waitForChallengeInitiation(playerADefaults),
  WaitForChallengeSubmission: channelStates.waitForChallengeSubmission(playerADefaults),
  WaitForChallengeConfirmation: channelStates.waitForChallengeConfirmation(playerADefaults),
  WaitForResponseOrTimeout: channelStates.waitForResponseOrTimeout(playerADefaults),
  AcknowledgeChallengeResponse: channelStates.acknowledgeChallengeResponse(playerADefaults),
  AcknowledgeChallengeTimeout: channelStates.acknowledgeChallengeTimeout(playerADefaults),
};
addStoriesFromCollection(WalletScreensChallenging, 'Wallet Screens / Challenging');

const WalletScreendsResponding = {
  ChooseResponse: channelStates.chooseResponse(playerADefaults),
  AcknowledgeChallengeTimeout: channelStates.challengeeAcknowledgeChallengeTimeOut(playerADefaults),
  TakeMoveInApp: channelStates.takeMoveInApp(playerADefaults),
  InitiateResponse: channelStates.initiateResponse(playerADefaults),
  WaitForResponseSubmission: channelStates.waitForResponseSubmission(playerADefaults),
  WaitForResponseConfirmation: channelStates.waitForResponseConfirmation(playerADefaults),
  AcknowledgeChallengeComplete: channelStates.acknowledgeChallengeComplete(playerADefaults),
};
addStoriesFromCollection(WalletScreendsResponding, 'Wallet Screens / Responding');

const WalletScreendsClosing = {
  ApproveConclude: channelStates.approveConclude(playerADefaults),
  WaitForOpponentConclude: channelStates.waitForOpponentConclude(playerADefaults),
  AcknowledgeConcludeSuccess: channelStates.approveCloseOnChain(playerADefaults),
};
addStoriesFromCollection(WalletScreendsClosing, 'Wallet Screens / Closing');

storiesOf('Wallet Landing Page', module).add(
  'Landing Page',
  channelStateRender(walletStates.waitForLogin({ outboxState: {} })),
);
