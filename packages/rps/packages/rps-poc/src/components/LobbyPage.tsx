import _ from 'lodash';
import React from 'react';

import { Challenge } from '../redux/application/reducer';

import CreateChallenge from './CreateChallenge';
import SelectChallenge from './SelectChallenge';
import { Button, ButtonGroup } from 'reactstrap';
import BN from 'bn.js';

interface Props {
  challenges: Challenge[];
  acceptChallenge: (address: string, stake: BN) => void;
  createChallenge: (name: string, stake: BN) => void;
  logoutRequest: () => void;
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
      <div className="container centered-container">
        <div className="w-100">
          <ButtonGroup className="d-flex w-100 mb-3">
            <Button
              className="w-50"
              outline={!this.state.showChallenges}
              onClick={this.showChallengesList}
            >
              Select an opponent
            </Button>
            <Button
              className="w-50"
              outline={this.state.showChallenges}
              onClick={this.showCreateChallenge}
            >
              Create a challenge
            </Button>
          </ButtonGroup>
          <div className="mb-5">
            {this.renderCreateChallenge()}
            {this.renderChallengesList()}
          </div>
          <Button onClick={() => this.props.logoutRequest()}>Logout</Button>
        </div>
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

    return <CreateChallenge createChallenge={this.props.createChallenge} />;
  }

  renderChallengesList() {
    if (!this.state.showChallenges) {
      return null;
    }

    return (
      <SelectChallenge
        challenges={this.props.challenges}
        acceptChallenge={this.props.acceptChallenge}
      />
    );
  }
}
