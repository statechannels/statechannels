import _ from 'lodash';
import React from 'react';

import fire from '../gateways/firebase'
import Opponent from '../domain/opponent';
import OpponentSelectionStep from './OpponentSelectionStep';
import SelectMoveStep from './SelectMoveStep';
import WaitForOpponentStep from './WaitForOpponentStep';
import { GAME_STAGES } from '../constants';

export default class PlayPage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      opponents: [],
      selectedMove: null,
      stage: GAME_STAGES.SELECT_CHALLENGER,
    };

    _.bindAll(this, [
      'createChallenge',
      'opponentsListener',
      'postNewChallenge',
      'selectChallenge',
      'selectMove',
    ]);
  }

  componentWillMount() {
    this.opponentsListener();
  }

  // Handlers

  createChallenge(name, wager) {
    let newOpponent = new Opponent({ name, wager });
    this.postNewChallenge(newOpponent);
  }

  selectChallenge() {
    console.log('TODO (select): DO SOMETHING HERE');
    this.setState({ stage: GAME_STAGES.SELECT_MOVE });
  }

  selectMove(id) {
    this.setState({ stage: GAME_STAGES.WAIT_FOR_OPPONENT_MOVE, moveId: id });
  }

  // Firebase API calls

  opponentsListener() {
    let opponentsRef = fire.database().ref('opponents').orderByKey();
    opponentsRef.on('value', snapshot => {
      let opponents = _.map(snapshot.val(), opponent => opponent);
      this.setState({ opponents });
    });
  }

  postNewChallenge(newOpponent) {
    fire.database().ref().child('opponents').push(newOpponent)
  }

  render() {
    const { stage, moveId, opponents } = this.state;

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
