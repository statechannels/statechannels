import { storiesOf } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';
import '../index.scss';
import { dummyWaitForLogin, dummyWaitForMetaMask } from './dummy-wallet-states';
import WalletContainer from '../containers/wallet';
import { ProtocolState } from '../redux/protocols';
import Modal from 'react-modal';
import StatusBarLayout from '../components/status-bar-layout';

const walletStateRender = state => () => {
  console.log(state);
  return (
    <Provider store={fakeStore(state)}>
      <WalletContainer position="center" />
    </Provider>
  );
};

const protocolStateRender = (protocolState: ProtocolState, Container) => () => {
  // TODO type Container
  return (
    <Provider store={fakeStore(protocolState)}>
      <Modal
        isOpen={true}
        className={'wallet-content-center'}
        overlayClassName={'wallet-overlay-center'}
        ariaHideApp={false}
      >
        <StatusBarLayout>
          <Container state={protocolState} />
        </StatusBarLayout>
      </Modal>
    </Provider>
  );
};

export function addStoriesFromScenario(scenario, chapter, container) {
  Object.keys(scenario).forEach(key => {
    if (scenario[key].state) {
      storiesOf(chapter, module).add(key, protocolStateRender(scenario[key].state, container));
    }
  });
}

const WalletScreensNotInitialized = {
  WaitForLogIn: dummyWaitForLogin,
  WaitForMetaMask: dummyWaitForMetaMask,
};

addStoriesFromCollection(WalletScreensNotInitialized, 'Not Initialized ');

const NetworkStatuses = {
  // TODO the UI currently inspects an environment variable (not the redux state) to infer networkId
  Mainnet: { ...dummyWaitForLogin, networkId: 1 },
  Kovan: { ...dummyWaitForLogin, networkId: 42 },
  Ropsten: { ...dummyWaitForLogin, networkId: 3 },
  Rinkeby: { ...dummyWaitForLogin, networkId: 4 },
  Ganache: { ...dummyWaitForLogin, networkId: 5777 },
};

addStoriesFromCollection(NetworkStatuses, 'Network Statuses');

storiesOf('Landing Page', module).add('Landing Page', walletStateRender({}));

export const fakeStore = state => ({
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

export function addStoriesFromCollection(collection, chapter, renderer = walletStateRender) {
  Object.keys(collection).map(storyName => {
    storiesOf(chapter, module).add(storyName, renderer(collection[storyName]));
  });
}
