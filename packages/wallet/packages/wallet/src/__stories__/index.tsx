import React from 'react';
import { storiesOf } from '@storybook/react';
import WalletContainer from '../containers/wallet';
import { Provider } from 'react-redux';
import * as walletStates from '../redux/state';
import * as channelStates from '../redux/channel-state/state';
import '../index.scss';
import * as scenarios from '../redux/__tests__/test-scenarios';
import NetworkStatus from '../components/network-status';

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
  funded: false,
};
const playerADefaults = {
  ...defaults,
  ourIndex: 0,
};
const playerBDefaults = {
  ...defaults,
  ourIndex: 1,
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

const initializedWalletState = walletStates.initialized({
  ...walletStates.waitForLogin(),
  unhandledAction: undefined,
  ...walletStates.emptyState,
  channelState: {
    initializedChannels: {
      [channelId]: channelStates.waitForFundingAndPostFundSetup({ ...playerADefaults }),
    },
    initializingChannels: {},
  },
  networkId: 4,
  adjudicator: '',
  uid: '',
  consensusLibrary: '0x0',
});

// Want to return top level wallet state, not the channel state
function walletStateFromChannelState<T extends channelStates.OpenedState>(
  channelState: T,
  networkId?: number,
): walletStates.WalletState {
  return {
    ...initializedWalletState,
    channelState: {
      initializedChannels: { [channelState.channelId]: channelState },
      initializingChannels: {},
    },
    networkId: networkId || 3,
  };
}

const walletStateRender = state => () => {
  const fullState = { ...initializedWalletState, networkId: 3, ...state };
  return (
    <Provider store={fakeStore(fullState)}>
      <WalletContainer />
    </Provider>
  );
};

const channelStateRender = channelState => () => {
  const walletState = walletStateFromChannelState(channelState);
  return (
    <Provider store={fakeStore(walletState)}>
      <WalletContainer />
    </Provider>
  );
};

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

function addStoriesFromCollection(collection, chapter, renderer = channelStateRender) {
  Object.keys(collection).map(storyName => {
    storiesOf(chapter, module).add(storyName, renderer(collection[storyName]));
  });
}

const WalletScreensFundingPlayerA = {
  WaitForTransactionSent: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerADefaults),
  },
  WaitForDepositApproval: {
    channelState: channelStates.waitForFundingAndPostFundSetup({
      ...playerADefaults,
    }),
  },
  WaitForDepositConfirmation: {
    channelState: channelStates.waitForFundingAndPostFundSetup({
      ...playerADefaults,
    }),
  },
  WaitForFundingConfirmed: {
    channelState: channelStates.waitForFundingAndPostFundSetup({
      ...playerADefaults,
    }),
  },
  WaitForPostFundSetup: { channelState: channelStates.aWaitForPostFundSetup(playerADefaults) },
};
addStoriesFromCollection(
  WalletScreensFundingPlayerA,
  'Wallet Screens / Funding / Player A',
  walletStateRender,
);

const WalletScreensFundingPlayerB = {
  NotSafeToDeposit: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
  },
  WaitForTransactionSent: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
  },
  WaitForDepositApproval: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
  },
  WaitForDepositConfirmation: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
  },
  WaitForFundingConfirmed: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
  },
  WaitForPostFundSetup: { channelState: channelStates.aWaitForPostFundSetup(playerBDefaults) },
};
addStoriesFromCollection(
  WalletScreensFundingPlayerB,
  'Wallet Screens / Funding / Player B',
  walletStateRender,
);

// Against bot, who sends funding too early:
const WalletScreensFundingPlayerAPart2 = {
  WaitForTransactionSent: {
    channelState: channelStates.waitForFundingConfirmation(playerADefaults),
  },
  WaitForDepositApproval: {
    channelState: channelStates.waitForFundingConfirmation({
      ...playerADefaults,
    }),
  },
  WaitForDepositConfirmation: {
    channelState: channelStates.waitForFundingConfirmation({
      ...playerADefaults,
    }),
  },
  WaitForFundingConfirmed: {
    channelState: channelStates.waitForFundingConfirmation({
      ...playerADefaults,
    }),
  },
};
addStoriesFromCollection(
  WalletScreensFundingPlayerAPart2,
  'Wallet Screens / Funding / Player A -- already have PostFundSetup',
  walletStateRender,
);

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
  channelStateRender(walletStates.waitForLogin()),
);
