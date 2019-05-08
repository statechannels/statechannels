import { storiesOf } from '@storybook/react';
import React from 'react';
import Modal from 'react-modal';
import { Provider } from 'react-redux';
import { Concluding } from '..';
import { fakeStore } from '../../../../../__stories__/index';
import StatusBarLayout from '../../../../../components/status-bar-layout';
import * as scenarios from './scenarios';
import { isTerminal } from '../../../responding/state';

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

// Convention is to add all scenarios here, and allow the
// addStories function to govern what ends up being shown.
addStories(scenarios.happyPath, 'Concluding / Instigator / Happy Path');
addStories(scenarios.channelDoesntExist, 'Concluding / Instigator / Channel doesnt exist');
addStories(scenarios.concludingNotPossible, 'Concluding / Instigator / Concluding impossible');
addStories(scenarios.defundingFailed, 'Concluding / Instigator / Defund failed');

function addStories(scenario, chapter) {
  Object.keys(scenario.states).forEach(key => {
    if (!isTerminal(scenario.states[key])) {
      storiesOf(chapter, module).add(key, render(<Concluding state={scenario.states[key]} />));
    }
  });
}
