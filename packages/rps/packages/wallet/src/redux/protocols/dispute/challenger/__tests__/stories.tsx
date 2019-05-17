import { storiesOf } from '@storybook/react';
import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import { Challenging } from '../../challenger';
import { fakeStore } from '../../../../../__stories__/index';
import StatusBarLayout from '../../../../../components/status-bar-layout';
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

addStories(scenarios.opponentResponds, 'Challenging / Opponent responds');
addStories(
  scenarios.challengeTimesOutAndIsDefunded,
  'Challenging / Challenge times out and is defunded',
);
addStories(scenarios.channelDoesntExist, "Challenging / Channel doesn't exist");
addStories(scenarios.channelNotFullyOpen, 'Challenging / Channel not fully open');
addStories(scenarios.alreadyHaveLatest, 'Challenging / Already have latest state');
addStories(scenarios.userDeclinesChallenge, 'Challenging / User declines challenge');
addStories(scenarios.transactionFails, 'Challenging / Transaction fails');

function addStories(scenario, chapter) {
  Object.keys(scenario).forEach(key => {
    if (scenario[key].state) {
      storiesOf(chapter, module).add(key, render(<Challenging state={scenario[key].state} />));
    }
  });
}
