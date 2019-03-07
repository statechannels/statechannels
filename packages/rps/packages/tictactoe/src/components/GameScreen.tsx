import React from 'react';
import Board from './Board';
import MagmoLogoContainer from '../containers/MagmoLogoContainer';
import GameFooterContainer from '../containers/GameFooterContainer';
import { Marks, Marker, Result, Player, Imperative } from '../core';

interface Props {
  you: Marker;
  noughts: Marks;
  crosses: Marks;
  onScreenBalances: [string, string];
  player: Player;
  result: Result | Imperative;
  // action goes here (.e.g. player picks a move)
  marksMade: (marks: Marks) => void;
  resign: () => void;
}

export default class GameScreen extends React.PureComponent<Props> {
  render() {
    const { you, noughts, crosses, marksMade } = this.props;
    return (
      <div>
        <div className="container centered-container game-container">
          <Board noughts={noughts} crosses={crosses} marksMade={marksMade} you={you} />
        </div>

        <MagmoLogoContainer />

        <GameFooterContainer />
      </div>
    );
  }
}
