import { storiesOf } from '@storybook/react';
import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import { Funding } from '..';
import { fakeStore } from '../../../../../__stories__/index';
import StatusBarLayout from '../../../../../components/status-bar-layout';
import * as scenarios from './scenarios';
import { isTerminal } from '../states';

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

addStories(scenarios.happyPath, 'Funding / Player B / Happy path');
addStories(scenarios.rejectedStrategy, 'Funding / Player B / Rejected strategy');
addStories(scenarios.cancelledByUser, 'Funding / Player B / Cancelled by user');
addStories(scenarios.cancelledByOpponent, 'Funding / Player B / Cancelled by opponent');

function addStories(scenario, chapter) {
  Object.keys(scenario.states).forEach(key => {
    if (!isTerminal(scenario.states[key])) {
      storiesOf(chapter, module).add(key, render(<Funding state={scenario.states[key].state} />));
    }
  });
}
