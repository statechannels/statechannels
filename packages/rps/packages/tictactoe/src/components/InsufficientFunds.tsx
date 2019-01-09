import React from 'react';
import Outcome from './Outcome';
import StatusAndBalances from './StatusAndBalances';
import { Marks, Marker, Result, Player, Imperative } from '../core';
import MAGMO_LOGO from '../images/magmo_logo.svg';


interface Props {
  you: Marker;
  noughts: Marks;
  crosses: Marks;
  onScreenBalances: [string, string];
  player: Player;
  result: Result | Imperative;
  // action goes here (.e.g. player picks a move)
  marksMade: (marks: Marks) => void;
}

export default class InsufficientFunds extends React.PureComponent<Props> {
  render() {
    const {you, onScreenBalances, player, result} = this.props;
    let Loser: string = "";
    if (result === Result.YouLose){
      Loser = "You have run ";
    } else {
      Loser = "Your opponent has run";
    }
    return (
    <div id="main-container">
      <StatusAndBalances onScreenBalances={onScreenBalances} player={player} you = {you}/>
      <div id="table-container">
        <div id="main-container">
              Game concluding:
            {/* TODO: Display which player ran out of funds. */}
            <h2 className="w-100 text-center">{ Loser } out of funds.</h2>
        <div id="magmo-logo"><img src={MAGMO_LOGO}/></div>
        </div>
      </div>
      <Outcome result={result} />
    </div>
    );
  }
}