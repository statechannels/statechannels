import {storiesOf} from "@storybook/react";
import React from "react";
import {Provider} from "react-redux";

import "../index.scss";
import Modal from "react-modal";

import WalletContainer from "../containers/wallet";
import {ProtocolState} from "../redux/protocols";
import StatusBarLayout from "../components/status-bar-layout";

const walletStateRender = state => () => {
  console.log(state);
  return (
    <Provider store={fakeStore(state) as any}>
      <WalletContainer position="center" />
    </Provider>
  );
};

const protocolStateRender = (protocolState: ProtocolState, Container) => () => {
  // TODO type Container
  return (
    <Provider store={fakeStore(protocolState) as any}>
      <Modal
        isOpen={true}
        className={"wallet-content-center"}
        overlayClassName={"wallet-overlay-center"}
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

storiesOf("Landing Page", module).add("Landing Page", walletStateRender({}));

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
  }
});

export function addStoriesFromCollection(collection, chapter, renderer = walletStateRender) {
  Object.keys(collection).map(storyName => {
    storiesOf(chapter, module).add(storyName, renderer(collection[storyName]));
  });
}
