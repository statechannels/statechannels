import React from 'react';
import Board from './Board';
import Outcome from './Outcome';
import StatusAndBalances from './StatusAndBalances';
import { Marks, Marker, Result, Player, Imperative } from '../core';
import MAGMO_LOGO from '../images/magmo_logo.svg';
import { Button } from 'reactstrap';


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
    const {you, noughts, crosses, onScreenBalances, player, result, marksMade, resign} = this.props;
    return (
    <div id="main-container">
      <StatusAndBalances onScreenBalances={onScreenBalances} player={player} you = {you}/>
      <Board noughts={noughts} crosses={crosses} marksMade={marksMade} you = {you}/>
      <div id="magmo-logo"><img src={MAGMO_LOGO}/></div>
      <Button className="cog-button-small resignButton" outline={false} onClick={resign}>
            Resign
      </Button>
      <Outcome result={result} />
    </div>
    );
  }
}