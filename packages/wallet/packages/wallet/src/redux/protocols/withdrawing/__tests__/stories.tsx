import { storiesOf } from '@storybook/react';
import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import { fakeStore } from '../../../../__stories__/index';
import StatusBarLayout from '../../../../components/status-bar-layout';
import * as scenarios from './scenarios';
import { Withdrawal } from '../container';

const render = container => () => {
  // todo: rework this modal stuff
  return (
    <Provider store={fakeStore({})}>
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

const happyPathStories = {
  WaitForApproval: scenarios.happyPath.waitForApproval,
  WaitForTransaction: scenarios.happyPath.waitForTransaction,
  WaitForAcknowledgement: scenarios.happyPath.waitForAcknowledgement,
  Success: scenarios.happyPath.success,
};

const withdrawalRejectedStories = {
  WaitForApproval: scenarios.withdrawalRejected.waitForApproval,
  Failure: scenarios.withdrawalRejected.failure,
};

const transactionFailureStories = {
  WaitForApproval: scenarios.failedTransaction.waitForApproval,
  WaitForTransaction: scenarios.failedTransaction.waitForTransaction,
  Failure: scenarios.failedTransaction.failure,
};

const channelNotClosedStories = {
  Failure: scenarios.channelNotClosed.failure,
};

addStories(happyPathStories, 'Withdrawal / Happy path');
addStories(withdrawalRejectedStories, 'Withdrawal / User rejects withdrawal ');
addStories(transactionFailureStories, 'Withdrawal / Transaction fails');
addStories(channelNotClosedStories, 'Withdrawal / Channel not closed');

function addStories(collection, chapter) {
  Object.keys(collection).map(storyName => {
    const state = collection[storyName];
    storiesOf(chapter, module).add(storyName, render(<Withdrawal state={state} />));
  });
}
