import React from 'react';

import OpponentSelectionStep from './OpponentSelectionStep';
import SelectMoveStep from './SelectMoveStep';
import WaitForOpponentStep from './WaitForOpponentStep';
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
      stage: GAME_STAGES.SELECT_CHALLENGER,
      selectedMove: null,
    };

    this.selectChallenge = this.selectChallenge.bind(this);
    this.createChallenge = this.createChallenge.bind(this);
    this.selectMove = this.selectMove.bind(this);
  }

  selectChallenge() {
    console.log('TODO (select): DO SOMETHING HERE');
    this.setState({ stage: GAME_STAGES.SELECT_MOVE });
  }

  createChallenge() {
    console.log('TODO (create): DO SOMETHING HERE');
  }

  selectMove(id) {
    this.setState({ stage: GAME_STAGES.WAIT_FOR_OPPONENT_MOVE, moveId: id });
  }

  render() {
    const { stage, moveId } = this.state;

    switch (stage) {
      case GAME_STAGES.SELECT_CHALLENGER:
        return (
          <OpponentSelectionStep
            handleSelectChallenge={this.selectChallenge}
            handleCreateChallenge={this.createChallenge}
            opponents={opponents}
          />
        );
      case GAME_STAGES.SELECT_MOVE:
        return <SelectMoveStep handleSelectMove={this.selectMove} />;
      case GAME_STAGES.WAIT_FOR_OPPONENT_MOVE:
        return <WaitForOpponentStep moveId={moveId} />;
      default:
        return null;
    }
  }
}
