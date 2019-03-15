import React from 'react';
import { storiesOf } from '@storybook/react';
import WalletContainer from '../containers/Wallet';
import { Provider } from 'react-redux';
import * as walletStates from '../redux/states';
import * as channelStates from '../redux/states/channels';
import '../index.scss';
import * as scenarios from '../redux/reducers/__tests__/test-scenarios';
import { bigNumberify } from 'ethers/utils';
import NetworkStatus from '../components/NetworkStatus';

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

storiesOf('Wallet Screens / Funding / Player A', module)
  .add('ApproveFunding', channelStateRender(channelStates.approveFunding(playerADefaults)))
  .add(
    'AWaitForDepositToBeSentToMetaMask',
    channelStateRender(channelStates.aWaitForDepositToBeSentToMetaMask(playerADefaults)),
  )
  .add(
    'ASubmitDepositInMetaMask',
    channelStateRender(channelStates.aSubmitDepositInMetaMask(playerADefaults)),
  )
  .add(
    'AWaitForDepositConfirmation',
    channelStateRender(channelStates.aWaitForDepositConfirmation(playerADefaults)),
  )
  .add(
    'AWaitForOpponentDeposit',
    channelStateRender(channelStates.aWaitForOpponentDeposit(playerADefaults)),
  )
  .add(
    'AWaitForPostFundSetup',
    channelStateRender(channelStates.aWaitForPostFundSetup(playerADefaults)),
  )
  .add(
    'AcknowledgeFundingSuccess',
    channelStateRender(channelStates.acknowledgeFundingSuccess(playerADefaults)),
  );

storiesOf('Wallet Screens / Funding / Player B', module)
  .add('ApproveFunding', channelStateRender(channelStates.approveFunding(playerBDefaults)))
  .add(
    'BWaitForOpponentDeposit',
    channelStateRender(channelStates.bWaitForOpponentDeposit(playerBDefaults)),
  )
  .add(
    'BWaitForDepositToBeSentToMetaMask',
    channelStateRender(channelStates.bWaitForDepositToBeSentToMetaMask(playerBDefaults)),
  )
  .add(
    'BSubmitDepositInMetaMask',
    channelStateRender(channelStates.bSubmitDepositInMetaMask(playerBDefaults)),
  )
  .add(
    'BWaitForDepositConfirmation',
    channelStateRender(channelStates.bWaitForDepositConfirmation(playerBDefaults)),
  )
  .add(
    'BWaitForPostFundSetup',
    channelStateRender(channelStates.bWaitForPostFundSetup(playerBDefaults)),
  )
  .add(
    'AcknowledgeFundingSuccess',
    channelStateRender(channelStates.acknowledgeFundingSuccess(playerBDefaults)),
  );

storiesOf('Wallet Screens / Withdrawing', module)
  .add('ApproveWithdrawal', channelStateRender(channelStates.approveWithdrawal(playerADefaults)))
  .add(
    'WaitForWithdrawalInitiation',
    channelStateRender(channelStates.waitForWithdrawalInitiation(playerADefaults)),
  )
  .add(
    'WaitForWithdrawalConfirmation',
    channelStateRender(channelStates.waitForWithdrawalConfirmation(playerADefaults)),
  )
  .add(
    'AcknowledgeWithdrawalSuccess',
    channelStateRender(channelStates.acknowledgeWithdrawalSuccess(playerADefaults)),
  );

storiesOf('Wallet Screens / Challenging', module)
  .add('ApproveChallenge', channelStateRender(channelStates.approveChallenge(playerADefaults)))
  .add(
    'WaitForChallengeInitiation',
    channelStateRender(channelStates.waitForChallengeInitiation(playerADefaults)),
  )
  .add(
    'WaitForChallengeSubmission',
    channelStateRender(channelStates.waitForChallengeSubmission(playerADefaults)),
  )
  .add(
    'WaitForChallengeConfirmation',
    channelStateRender(channelStates.waitForChallengeConfirmation(playerADefaults)),
  )
  .add(
    'WaitForResponseOrTimeout',
    channelStateRender(channelStates.waitForResponseOrTimeout(playerADefaults)),
  )
  .add(
    'AcknowledgeChallengeResponse',
    channelStateRender(channelStates.acknowledgeChallengeResponse(playerADefaults)),
  )
  .add(
    'AcknowledgeChallengeTimeout',
    channelStateRender(channelStates.acknowledgeChallengeTimeout(playerADefaults)),
  );

storiesOf('Wallet Screens / Responding', module)
  .add('ChooseResponse', channelStateRender(channelStates.chooseResponse(playerADefaults)))
  .add(
    'AcknowledgeChallengeTimeout',
    channelStateRender(channelStates.challengeeAcknowledgeChallengeTimeOut(playerADefaults)),
  )
  .add('TakeMoveInApp', channelStateRender(channelStates.takeMoveInApp(playerADefaults)))
  .add('InitiateResponse', channelStateRender(channelStates.initiateResponse(playerADefaults)))
  .add(
    'WaitForResponseSubmission',
    channelStateRender(channelStates.waitForResponseSubmission(playerADefaults)),
  )
  .add(
    'WaitForResponseConfirmation',
    channelStateRender(channelStates.waitForResponseConfirmation(playerADefaults)),
  )
  .add(
    'AcknowledgeChallengeComplete',
    channelStateRender(channelStates.acknowledgeChallengeComplete(playerADefaults)),
  );

storiesOf('Wallet Screens / Closing', module)
  .add('ApproveConclude', channelStateRender(channelStates.approveConclude(playerADefaults)))
  .add(
    'WaitForOpponentConclude',
    channelStateRender(channelStates.waitForOpponentConclude(playerADefaults)),
  )
  .add(
    'AcknowledgeConcludeSuccess',
    channelStateRender(channelStates.approveCloseOnChain(playerADefaults)),
  );

storiesOf('Wallet Landing Page', module).add(
  'Landing Page',
  channelStateRender(walletStates.waitForLogin({ outboxState: {} })),
);
