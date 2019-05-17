import { storiesOf } from '@storybook/react';
import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import { fakeStore } from '../../../../../__stories__/index';
import StatusBarLayout from '../../../../../components/status-bar-layout';
import * as scenarios from './scenarios';
import { Responder } from '../container';

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

const refuteHappyPathStories = {
  WaitForApproval: scenarios.refuteHappyPath.waitForApproval,
  WaitForTransaction: scenarios.refuteHappyPath.waitForTransaction,
  WaitForAcknowledgement: scenarios.refuteHappyPath.waitForAcknowledgement,
  Success: scenarios.refuteHappyPath.success,
};

const respondWithExistingMoveHappyPathStories = {
  WaitForApproval: scenarios.respondWithExistingCommitmentHappyPath.waitForApproval,
  WaitForTransaction: scenarios.respondWithExistingCommitmentHappyPath.waitForTransaction,
  WaitForAcknowledgement: scenarios.respondWithExistingCommitmentHappyPath.waitForAcknowledgement,
  Success: scenarios.respondWithExistingCommitmentHappyPath.success,
};

const requireResponseHappyPathStories = {
  WaitForApproval: scenarios.respondWithExistingCommitmentHappyPath.waitForApproval,
  WaitForResponse: scenarios.requireResponseHappyPath.waitForResponse,
  WaitForTransaction: scenarios.respondWithExistingCommitmentHappyPath.waitForTransaction,
  WaitForAcknowledgement: scenarios.respondWithExistingCommitmentHappyPath.waitForAcknowledgement,
  Success: scenarios.requireResponseHappyPath.success,
};

const transactionFailureStories = {
  WaitForApproval: scenarios.transactionFails.waitForApproval,
  WaitForTransaction: scenarios.transactionFails.waitForTransaction,
  Failure: scenarios.transactionFails.failure,
};

addStories(respondWithExistingMoveHappyPathStories, 'Responding / Respond with Existing Move');
addStories(requireResponseHappyPathStories, 'Responding / Requires new Response');
addStories(refuteHappyPathStories, 'Responding / Refute challenge');
addStories(transactionFailureStories, 'Responding / Transaction fails');

function addStories(collection, chapter) {
  Object.keys(collection).map(storyName => {
    const state = collection[storyName];
    storiesOf(chapter, module).add(storyName, render(<Responder state={state} />));
  });
}
