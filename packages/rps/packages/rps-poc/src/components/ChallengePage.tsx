import _ from 'lodash';
import React from 'react';

import { Challenge } from '../redux/application/reducer';

import CreateChallenge from './CreateChallenge';
import SelectChallenge from './SelectChallenge';
import Button from './Button';

interface Props {
  challenges: Challenge[],
  acceptChallenge: (address: string, stake: number) => void,
  createChallenge: (name: string, stake: number) => void,
  autoOpponentAddress: string,
}

const initialState = { showChallenges: true };
type State = Readonly<typeof initialState>;

export default class ChallengePage extends React.PureComponent<Props, State> {
  readonly state: State = initialState;

  constructor(props) {
    super(props);
    this.showChallengesList = this.showChallengesList.bind(this);
    this.showCreateChallenge = this.showCreateChallenge.bind(this);
    this.renderCreateChallenge = this.renderCreateChallenge.bind(this);
    this.renderChallengesList = this.renderChallengesList.bind(this);
  }

  render() {
    return (
      <div>
        <div className="challengePageHeader">
          <Button onClick={this.showChallengesList}>Select an opponent</Button>
          <Button onClick={this.showCreateChallenge}>Create a challenge</Button>
        </div>
        {this.renderCreateChallenge()}
        {this.renderChallengesList()}
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
      />
    );
  }

  renderChallengesList() {
    if (!this.state.showChallenges) {
      return null;
    }

    return (
      <SelectChallenge
        autoOpponentAddress={this.props.autoOpponentAddress}
        challenges={this.props.challenges}
        acceptChallenge={this.props.acceptChallenge}
      />
    );
  }
}
