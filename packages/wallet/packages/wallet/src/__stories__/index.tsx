import React from 'react';
import { storiesOf } from '@storybook/react';
import WalletContainer from '../containers/Wallet';
import { Provider } from 'react-redux';
import * as walletStates from '../redux/state';
import * as channelStates from '../redux/channelState/state';
import * as fundingStates from '../redux/fundingState/state';
import '../index.scss';
import * as scenarios from '../redux/__tests__/test-scenarios';
import { bigNumberify } from 'ethers/utils';
import NetworkStatus from '../components/NetworkStatus';
import { channelFunded } from '../redux/fundingState/state';
import { EMPTY_OUTBOX_STATE } from 'src/redux/outbox/state';

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

const YOUR_CONTRIBUTION = bigNumberify(500000000000000).toHexString();
const TOTAL_CONTRIBUTION = bigNumberify(YOUR_CONTRIBUTION)
  .mul(2)
  .toHexString();

const defaultFundingState: fundingStates.DirectFundingState = {
  fundingType: fundingStates.DIRECT_FUNDING,
  requestedTotalFunds: TOTAL_CONTRIBUTION,
  requestedYourContribution: YOUR_CONTRIBUTION,
  channelId: 'channel id',
  ourIndex: 0,
  safeToDepositLevel: YOUR_CONTRIBUTION,
  depositStatus: fundingStates.depositing.WAIT_FOR_TRANSACTION_SENT,
  channelFundingStatus: fundingStates.NOT_SAFE_TO_DEPOSIT,
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
  fundingState: channelFunded(defaultFundingState),
};
const playerBDefaults = {
  ...defaults,
  ourIndex: 1,
  fundingState: channelFunded(defaultFundingState),
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
  outboxState: EMPTY_OUTBOX_STATE,
  channelState: {
    initializedChannels: { [channelId]: channelStates.approveFunding({ ...playerADefaults }) },
    initializingChannels: {},
  },
  networkId: 4,
  adjudicator: '',
  uid: '',
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
  ApproveFunding: { channelState: channelStates.approveFunding(playerADefaults) },
  WaitForTransactionSent: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerADefaults),
    fundingState: fundingStates.depositing.waitForTransactionSent(defaultFundingState),
  },
  WaitForDepositApproval: {
    channelState: channelStates.waitForFundingAndPostFundSetup({
      ...playerADefaults,
    }),
    fundingState: fundingStates.depositing.waitForDepositApproval(defaultFundingState),
  },
  WaitForDepositConfirmation: {
    channelState: channelStates.waitForFundingAndPostFundSetup({
      ...playerADefaults,
    }),
    fundingState: fundingStates.depositing.waitForDepositConfirmation(fundingStateWithTX),
  },
  WaitForFundingConfirmed: {
    channelState: channelStates.waitForFundingAndPostFundSetup({
      ...playerADefaults,
    }),
    fundingState: fundingStates.waitForFundingConfirmed(defaultFundingState),
  },
  WaitForPostFundSetup: { channelState: channelStates.aWaitForPostFundSetup(playerADefaults) },
  AcknowledgeFundingSuccess: {
    channelState: channelStates.acknowledgeFundingSuccess(playerADefaults),
  },
};
addStoriesFromCollection(
  WalletScreensFundingPlayerA,
  'Wallet Screens / Funding / Player A',
  walletStateRender,
);

const WalletScreensFundingPlayerB = {
  ApproveFunding: { channelState: channelStates.approveFunding(playerBDefaults) },
  NotSafeToDeposit: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
    fundingState: fundingStates.notSafeToDeposit(defaultFundingState),
  },
  WaitForTransactionSent: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
    fundingState: fundingStates.depositing.waitForTransactionSent(defaultFundingState),
  },
  WaitForDepositApproval: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
    fundingState: fundingStates.depositing.waitForDepositApproval(defaultFundingState),
  },
  WaitForDepositConfirmation: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
    fundingState: fundingStates.depositing.waitForDepositConfirmation(fundingStateWithTX),
  },
  WaitForFundingConfirmed: {
    channelState: channelStates.waitForFundingAndPostFundSetup(playerBDefaults),
    fundingState: fundingStates.waitForFundingConfirmed(defaultFundingState),
  },
  WaitForPostFundSetup: { channelState: channelStates.aWaitForPostFundSetup(playerBDefaults) },
  AcknowledgeFundingSuccess: {
    channelState: channelStates.acknowledgeFundingSuccess(playerBDefaults),
  },
};
addStoriesFromCollection(
  WalletScreensFundingPlayerB,
  'Wallet Screens / Funding / Player B',
  walletStateRender,
);

// Against bot, who sends funding too early:
const WalletScreensFundingPlayerAPart2 = {
  ApproveFunding: { channelState: channelStates.approveFunding(playerADefaults) },
  WaitForTransactionSent: {
    channelState: channelStates.waitForFundingConfirmation(playerADefaults),
    fundingState: fundingStates.depositing.waitForTransactionSent(defaultFundingState),
  },
  WaitForDepositApproval: {
    channelState: channelStates.waitForFundingConfirmation({
      ...playerADefaults,
    }),
    fundingState: fundingStates.depositing.waitForDepositApproval(defaultFundingState),
  },
  WaitForDepositConfirmation: {
    channelState: channelStates.waitForFundingConfirmation({
      ...playerADefaults,
    }),
    fundingState: fundingStates.depositing.waitForDepositConfirmation(fundingStateWithTX),
  },
  WaitForFundingConfirmed: {
    channelState: channelStates.waitForFundingConfirmation({
      ...playerADefaults,
    }),
    fundingState: fundingStates.waitForFundingConfirmed(defaultFundingState),
  },
  AcknowledgeFundingSuccess: {
    channelState: channelStates.acknowledgeFundingSuccess(playerADefaults),
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
