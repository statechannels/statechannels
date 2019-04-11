import { storiesOf } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';
import WalletContainer from '../containers/wallet';
import '../index.scss';
import * as indirectFundingPlayerA from '../redux/indirect-funding/player-a/state';
import * as indirectFundingPlayerB from '../redux/indirect-funding/player-b/state';
import * as walletStates from '../redux/state';
import { indirectFundingWalletState as indirectFundingWalletStateA } from './a-dummy-wallet-states';
import { indirectFundingWalletState as indirectFundingWalletStateB } from './b-dummy-wallet-states';
import {
  dummyWaitForAdjudicator,
  dummyWaitForLogin,
  dummyWaitForMetaMask,
} from './dummy-wallet-states';

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

const walletStateRender = state => () => {
  return (
    <Provider store={fakeStore(state)}>
      <WalletContainer position="center" />
    </Provider>
  );
};

const twinWalletStateRender = (
  aState: walletStates.Initialized,
  bState: walletStates.Initialized,
) => () => {
  return (
    <div>
      Player A x Player B
      <Provider store={fakeStore(aState)}>
        <WalletContainer position="left" />
      </Provider>
      <Provider store={fakeStore(bState)}>
        <WalletContainer position="right" />
      </Provider>
    </div>
  );
};

function addTwinStoriesFromCollection(collection, chapter, renderer = twinWalletStateRender) {
  Object.keys(collection).map(storyName => {
    storiesOf(chapter, module).add(
      storyName,
      renderer(collection[storyName].a, collection[storyName].b),
    );
  });
}

function addStoriesFromCollection(collection, chapter, renderer = walletStateRender) {
  Object.keys(collection).map(storyName => {
    storiesOf(chapter, module).add(storyName, renderer(collection[storyName]));
  });
}

const WalletScreensNotInitialized = {
  WaitForLogIn: dummyWaitForLogin,
  WaitForAdjudicator: dummyWaitForAdjudicator,
  WaitForMetaMask: dummyWaitForMetaMask,
};

addStoriesFromCollection(WalletScreensNotInitialized, 'Not Initialized ');

const NetworkStatuses = {
  Mainnet: { ...dummyWaitForLogin, networkId: 1 },
  Kovan: { ...dummyWaitForLogin, networkId: 42 },
  Ropsten: { ...dummyWaitForLogin, networkId: 3 },
  Rinkeby: { ...dummyWaitForLogin, networkId: 4 },
  Ganache: { ...dummyWaitForLogin, networkId: 5777 },
};

addStoriesFromCollection(NetworkStatuses, 'Network Statuses');

const TwinWalletScreensIndirectFunding = {
  'Both in WaitForApproval': {
    a: indirectFundingWalletStateA(indirectFundingPlayerA.WAIT_FOR_APPROVAL),
    b: indirectFundingWalletStateB(indirectFundingPlayerB.WAIT_FOR_APPROVAL),
  },
  'Both in WaitForPreFundSetup': {
    a: indirectFundingWalletStateA(indirectFundingPlayerA.WAIT_FOR_PRE_FUND_SETUP_1),
    b: indirectFundingWalletStateB(indirectFundingPlayerB.WAIT_FOR_PRE_FUND_SETUP_0),
  },
  'Both in WaitForDirectFunding': {
    a: indirectFundingWalletStateA(indirectFundingPlayerA.WAIT_FOR_DIRECT_FUNDING),
    b: indirectFundingWalletStateB(indirectFundingPlayerB.WAIT_FOR_DIRECT_FUNDING),
  },
  'Both in WaitForPostFundSetup': {
    a: indirectFundingWalletStateA(indirectFundingPlayerA.WAIT_FOR_POST_FUND_SETUP_1),
    b: indirectFundingWalletStateB(indirectFundingPlayerB.WAIT_FOR_POST_FUND_SETUP_0),
  },
  'Both in WaitForLedgerUpdate': {
    a: indirectFundingWalletStateA(indirectFundingPlayerA.WAIT_FOR_LEDGER_UPDATE_1),
    b: indirectFundingWalletStateB(indirectFundingPlayerB.WAIT_FOR_LEDGER_UPDATE_0),
  },
  'B in WaitForConsensus': {
    a: indirectFundingWalletStateA(indirectFundingPlayerA.WAIT_FOR_LEDGER_UPDATE_1),
    b: indirectFundingWalletStateB(indirectFundingPlayerB.WAIT_FOR_CONSENSUS),
  },
};

addTwinStoriesFromCollection(
  TwinWalletScreensIndirectFunding,
  'Indirect Funding Process',
  twinWalletStateRender,
);

storiesOf('Landing Page', module).add('Landing Page', walletStateRender({}));
