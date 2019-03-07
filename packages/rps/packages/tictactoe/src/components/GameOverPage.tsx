import _ from 'lodash';
import React from 'react';
import MagmoLogoContainer from '../containers/MagmoLogoContainer';
import GameFooterContainer from '../containers/GameFooterContainer';
import { Button } from 'reactstrap';
import Board from './Board';
import { Marks, Marker } from '../core';

interface Props {
  you: Marker;
  conclude: () => void;
  visible: boolean;
  ourTurn: boolean;
  noughts: Marks;
  crosses: Marks;
  marksMade: (x: Marks) => void;
}

export default class GameOverPage extends React.PureComponent<Props> {
  render() {
    const { you, noughts, crosses, marksMade, ourTurn } = this.props;
    return (
      <div className="w-100">
        <div className="container centered-container w-100 game-container">
          <Board noughts={noughts} crosses={crosses} marksMade={marksMade} you={you} />
          {ourTurn && (
            <Button
              className="footer-playagain navbar-button ml-auto"
              onClick={this.props.conclude}
            >
              Close and Withdraw
            </Button>
          )}
          {!ourTurn && (
            <Button
              className="footer-playagain navbar-button ml-auto"
              onClick={this.props.conclude}
              disabled={true}
            >
              Waiting...
            </Button>
          )}
        </div>

        <MagmoLogoContainer />
        <GameFooterContainer />
      </div>
    );
  }
}
