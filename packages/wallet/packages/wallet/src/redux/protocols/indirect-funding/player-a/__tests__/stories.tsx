import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import IndirectFundingContainer from '../../../../../containers/indirect-funding/indirect-funding';
import { happyPath } from './scenarios';
import * as storybookUtils from '../../../../../__stories__/index';

const render = state => () => {
  const container = <IndirectFundingContainer state={state} />;
  return (
    <Provider store={storybookUtils.fakeStore({})}>
      <Modal
        isOpen={true}
        className={'wallet-content-center'}
        overlayClassName={'wallet-overlay-center'}
        ariaHideApp={false}
      >
        {container}
      </Modal>
    </Provider>
  );
};

const indirectFundingScreens = {
  WaitForApproval: happyPath.states.waitForApproval.protocolState,
  WaitForPreFundSetup: happyPath.states.waitForPreFundSetup1.protocolState,
  WaitForDirectFunding: happyPath.states.waitForDirectFunding.protocolState,
  WaitForPostFundSetup: happyPath.states.waitForPostFundSetup1.protocolState,
  WaitForLedgerUpdate: happyPath.states.waitForLedgerUpdate1.protocolState,
  WaitForConsensus: happyPath.states.waitForLedgerUpdate1.protocolState,
};

storybookUtils.addStoriesFromCollection(
  indirectFundingScreens,
  'Indirect Funding Player A',
  render,
);
