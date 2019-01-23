import React from 'react';
import NavigationBarContainer from "../containers/NavigationBarContainer";
import GameBarContainer from "../containers/GameBarContainer";
import MagmoLogoContainer from "../containers/MagmoLogoContainer";
import GameFooterContainer from "../containers/GameFooterContainer";

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
    const {result} = this.props;
    let Loser: string = "";
    if (result === Result.YouLose){
      Loser = "You have run ";
    } else {
      Loser = "Your opponent has run";
    }
    return (
    <div id="w-100">
        <NavigationBarContainer />
        <GameBarContainer />
        <div id="table-container">
        <div id="main-container">
              Game concluding:
            <h2 className="w-100 text-center">{ Loser } out of funds.</h2>
        <div id="magmo-logo"><img src={MAGMO_LOGO}/></div>
        </div>
      </div>
      <MagmoLogoContainer />

      <GameFooterContainer />
    </div>
    );
  }
}