import { storiesOf } from '@storybook/react';
import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import { Challenging } from '..';
import { fakeStore } from '../../../../__stories__/index';
import StatusBarLayout from '../../../../components/status-bar-layout';
import * as scenarios from './scenarios';

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

const opponentResponds = {
  ApproveChallenge: scenarios.opponentResponds.approveChallenge,
  WaitForTransaction: scenarios.opponentResponds.waitForTransaction,
  WaitForResponseOrTimeout: scenarios.opponentResponds.waitForResponseOrTimeout,
  AcknowledgeResponse: scenarios.opponentResponds.acknowledgeResponse,
};

const challengeTimesOut = {
  WaitForResponseOrTimeout: scenarios.challengeTimesOut.waitForResponseOrTimeout,
  AcknowledgeTimeout: scenarios.challengeTimesOut.acknowledgeTimeout,
};

const channelDoesntExist = {
  AcknowledgeFailure: scenarios.channelDoesntExist.acknowledgeFailure,
};

const channelNotFullyOpen = {
  AcknowledgeFailure: scenarios.channelNotFullyOpen.acknowledgeFailure,
};

const alreadyHaveLatest = {
  AcknowledgeFailure: scenarios.alreadyHaveLatest.acknowledgeFailure,
};

const userDeclinesChallenge = {
  ApproveChallenge: scenarios.userDeclinesChallenge.approveChallenge,
  AcknowledgeFailure: scenarios.userDeclinesChallenge.acknowledgeFailure,
};

const transactionFails = {
  WaitForTransaction: scenarios.transactionFails.waitForTransaction,
  AcknowledgeFailure: scenarios.transactionFails.acknowledgeFailure,
};

addStories(opponentResponds, 'Challenging / Opponent responds');
addStories(challengeTimesOut, 'Challenging / Challenge times out');
addStories(channelDoesntExist, "Challenging / Channel doesn't exist");
addStories(channelNotFullyOpen, 'Challenging / Channel not fully open');
addStories(alreadyHaveLatest, 'Challenging / Already have latest state');
addStories(userDeclinesChallenge, 'Challenging / User declines challenge');
addStories(transactionFails, 'Challenging / Transaction fails');

function addStories(collection, chapter) {
  Object.keys(collection).map(storyName => {
    const state = collection[storyName];
    storiesOf(chapter, module).add(storyName, render(<Challenging state={state} />));
  });
}
