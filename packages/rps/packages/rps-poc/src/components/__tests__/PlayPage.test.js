import React from 'react';
import ReactDOM from 'react-dom';
import { shallow } from 'enzyme';

import PlayPage from '../PlayPage';

// Stages to test render
import GameCancelledStep from '../GameCancelledStep';
import OpponentSelectionStep from '../OpponentSelectionStep';
import RevealStep from '../RevealStep';
import SelectPlayStep from '../SelectPlayStep';
import SendingMessageStep from '../SendingMessageStep';
import WaitingStep from '../WaitingStep';

import { GE_STAGES } from '../../constants';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<PlayPage />, div);
  ReactDOM.unmountComponentAtNode(div);
});

const wrapper = shallow(<PlayPage />);

it('renders OpponentSelectionStep to start', () => {
  expect(wrapper.find(OpponentSelectionStep).length).toEqual(1);
});

it('renders SendingMessageStep', () => {
  wrapper.setState({ stage: GE_STAGES.READY_TO_SEND_PREFUND });
  expect(wrapper.find(SendingMessageStep).length).toEqual(1);
});

it('renders SelectPlayStep', () => {
  wrapper.setState({ stage: GE_STAGES.SELECT_PLAY });
  expect(wrapper.find(SelectPlayStep).length).toEqual(1);
});

it('renders RevealStep', () => {
  wrapper.setState({ stage: GE_STAGES.ROUND_CONCLUDED });
  expect(wrapper.find(RevealStep).length).toEqual(1);
});

it('renders WaitingStep', () => {
  wrapper.setState({ stage: GE_STAGES.PREFUND_SENT });
  expect(wrapper.find(WaitingStep).length).toEqual(1);
});

it('renders WaitingStep (forChain)', () => {
  wrapper.setState({ stage: GE_STAGES.READY_TO_DEPLOY_ADJUDICATOR });
  expect(wrapper.find(WaitingStep).length).toEqual(1);
});

it('renders GameCancelledStep (when cancelled by you)', () => {
  wrapper.setState({ stage: GE_STAGES.GAME_CANCELLED_BY_YOU });
  expect(wrapper.find(GameCancelledStep).length).toEqual(1);
});

it('renders GameCancelledStep (when cancelled by opponent)', () => {
  wrapper.setState({ stage: GE_STAGES.GAME_CANCELLED_BY_OPPONENT });
  expect(wrapper.find(GameCancelledStep).length).toEqual(1);
});
