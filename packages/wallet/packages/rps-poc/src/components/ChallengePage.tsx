import _ from 'lodash';
import React from 'react';

import { Opponent } from '../redux/reducers/opponents';

import CreateChallenge from './CreateChallenge';
import OpponentSelectionStep from './OpponentSelectionStep';
import Button from './Button';

interface Props {
  chooseOpponent: (opponentAddress: string, stake: number) => void;
  playComputer: (stake: number) => void;
  opponents: Opponent[];
  currentPlayer?: {
    address: string;
    name: string;
  };
  createChallenge: (challenge: any) => void;
}

const initialState = { showChallenges: true };
type State = Readonly<typeof initialState>;

export default class ChallengePage extends React.PureComponent<Props, State> {
  readonly state: State = initialState;

  constructor(props) {
    super(props);
    _.bindAll(this, [
      'showChallengesList',
      'showCreateChallenge',
      'renderCreateChallenge',
      'renderOpponentsList',
    ]);
  }

  render() {
    return (
      <div>
        <div className="challengePageHeader">
          <Button onClick={this.showChallengesList}>Select an opponent</Button>
          <Button onClick={this.showCreateChallenge}>Create a challenge</Button>
        </div>
        {this.renderCreateChallenge()}
        {this.renderOpponentsList()}
      </div>
    );
  }

  showChallengesList() {
    this.setState({ showChallenges: true });
  }

  showCreateChallenge() {
    this.setState({ showChallenges: false });
  }

  renderCreateChallenge() {
    if (this.state.showChallenges) {
      return null;
    }

    return (
      <CreateChallenge
        createChallenge={this.props.createChallenge}
        currentPlayer={this.props.currentPlayer}
      />
    );
  }

  renderOpponentsList() {
    if (!this.state.showChallenges) {
      return null;
    }

    return (
      <OpponentSelectionStep
        chooseOpponent={this.props.chooseOpponent}
        playComputer={this.props.playComputer}
        opponents={this.props.opponents}
        currentPlayer={this.props.currentPlayer}
      />
    );
  }
}
