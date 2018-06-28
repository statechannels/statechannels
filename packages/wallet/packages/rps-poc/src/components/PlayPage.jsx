import _ from 'lodash';
import React from 'react';

import fire from '../gateways/firebase';
import Opponent from '../domain/opponent';
import OpponentSelectionStep from './OpponentSelectionStep';
import SelectMoveStep from './SelectMoveStep';
import WaitForOpponentStep from './WaitForOpponentStep';
import RevealStep from './RevealStep';
import ConfirmWagerStep from './ConfirmWagerStep';
import GameCancelledStep from './GameCancelledStep';

import { GAME_STAGES } from '../constants';

export default class PlayPage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      opponents: [],
      selectedMoveId: null,
      opponentMoveId: null,
      stage: GAME_STAGES.SELECT_CHALLENGER,
    };

    _.bindAll(this, [
      'createChallenge',
      'opponentsListener',
      'postNewChallenge',
      'selectChallenge',
      'selectMove',
      'confirmWager',
      'cancelGame',
      'returnToStart',
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

  selectMove(selectedMove) {
    this.setState({ stage: GAME_STAGES.WAIT_FOR_OPPONENT_MOVE, selectedMoveId: selectedMove });
  }

  confirmWager() {
    // TODO: Send message to player A
    this.setState({ stage: GAME_STAGES.WAIT_FOR_PLAYER });
  }

  cancelGame() {
    // TODO: Send message to opponent
    this.setState({ stage: GAME_STAGES.GAME_CANCELLED_BY_YOU });
  }

  returnToStart() {
    // TODO: Send message to opponent
    this.setState({ stage: GAME_STAGES.SELECT_CHALLENGER });
  }

  // Firebase API calls

  opponentsListener() {
    let opponentsRef = fire
      .database()
      .ref('opponents')
      .orderByKey();
    opponentsRef.on('value', snapshot => {
      let opponents = _.map(snapshot.val(), opponent => opponent);
      this.setState({ opponents });
    });
  }

  postNewChallenge(newOpponent) {
    fire
      .database()
      .ref()
      .child('opponents')
      .push(newOpponent);
  }

  render() {
    const { stage, selectedMoveId, opponentMoveId, opponents } = this.state;

    // TODO: order these as done in constants.js
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
      case GAME_STAGES.SELECT_MOVE_AFTER_OPPONENT:
        return <SelectMoveStep handleSelectMove={this.selectMove} />;
      case GAME_STAGES.WAITING_FOR_PLAYER:
        return <WaitForOpponentStep selectedMoveId={selectedMoveId} />;
      case GAME_STAGES.REVEAL_WINNER_WITH_PROMPT:
        return <RevealStep selectedMoveId={selectedMoveId} opponentMoveId={opponentMoveId} />;
      case GAME_STAGES.CONFIRM_WAGER:
        return (
          <ConfirmWagerStep
            wager={300}
            handleReject={this.cancelGame}
            handleConfirm={this.confirmWager}
          />
        );
      case GAME_STAGES.GAME_CANCELLED_BY_YOU:
        return <GameCancelledStep cancelledBySelf returnToStart={this.returnToStart} />;
      case GAME_STAGES.GAME_CANCELLED_BY_OPPONENT:
        return <GameCancelledStep returnToStart={this.returnToStart} />;
      default:
        console.log('The following state does not have an associated step component: ', stage);
        return null;
    }
  }
}
