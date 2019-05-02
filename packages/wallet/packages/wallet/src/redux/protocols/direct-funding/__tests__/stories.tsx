import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import DirectFundingContainer from '../container';
import { aEachDepositsInSequenceHappyStates } from './scenarios';
import * as storybookUtils from '../../../../__stories__/index';
import StatusBarLayout from '../../../../components/status-bar-layout';

const render = state => () => {
  const container = <DirectFundingContainer directFundingState={state} />;
  return (
    <Provider store={storybookUtils.fakeStore({})}>
      <Modal
        isOpen={true}
        className={'wallet-content-center'}
        overlayClassName={'wallet-overlay-center'}
        ariaHideApp={false}
      >
        <StatusBarLayout>{container}</StatusBarLayout>
      </Modal>
    </Provider>
  );
};

const directFundingScreens = {
  NotSafeToDeposit: aEachDepositsInSequenceHappyStates.notSafeToDeposit.protocolState,
  WaitForTransactionSubmissionStart:
    aEachDepositsInSequenceHappyStates.waitForDepositTransactionStart.protocolState,
  WaitForTransactionSubmissionEnd:
    aEachDepositsInSequenceHappyStates.waitForDepositTransactionEnd.protocolState,
  WaitForFundingConfirmation:
    aEachDepositsInSequenceHappyStates.waitForFundingAndPostFundSetup.protocolState,
  ChannelFunded: aEachDepositsInSequenceHappyStates.fundingSuccess.protocolState,
};

storybookUtils.addStoriesFromCollection(directFundingScreens, 'Direct Funding Happy Path', render);
