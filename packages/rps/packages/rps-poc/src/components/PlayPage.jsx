import React from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import { GAME_STAGES } from '../constants';

// TODO: Get from Firebase
const opponents = [
  {
    name: 'Joe Bob',
    wager: '500',
    time: '12:39pm',
    id: 0,
  },
  {
    name: 'Sarah Beth',
    wager: '700',
    time: '1:28pm',
    id: 1,
  },
  {
    name: 'Mary Jane',
    wager: '50',
    time: '3:33pm',
    id: 2,
  },
  {
    name: 'James Fickel',
    wager: '5000',
    time: '4:01pm',
    id: 3,
  },
];

export default class PlayPage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      stage: GAME_STAGES.SELECT_CHALLENGE,
    };

    this.selectChallenge = this.selectChallenge.bind(this);
    this.createChallenge = this.createChallenge.bind(this);
  }

  selectChallenge() {
    console.log('TODO (select): DO SOMETHING HERE');
  }

  createChallenge() {
    console.log('TODO (select): DO SOMETHING HERE');
  }

  render() {
    return (
      <OpponentSelectionStep
        handleSelectChallenge={this.selectChallenge}
        handleCreateChallenge={this.createChallenge}
        opponents={opponents}
      />
    );
  }
}
