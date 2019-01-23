import React from "react";
import Board from "./Board";
import { Marks, Marker, Result, Player, Imperative } from "../core";
import NavigationBarContainer from "../containers/NavigationBarContainer";
import GameBarContainer from "../containers/GameBarContainer";
import GameFooterContainer from "../containers/GameFooterContainer";

import { Button } from "reactstrap";
import MagmoLogoContainer from "../containers/MagmoLogoContainer";

interface Props {
  you: Marker;
  noughts: Marks;
  crosses: Marks;
  onScreenBalances: [string, string];
  player: Player;
  result: Result | Imperative;
  // action goes here (.e.g. player picks a move)
  playAgain: () => void;
  marksMade: (x: Marks) => void;
  resign: () => void;
}

export default class PlayAgain extends React.PureComponent<Props> {
  render() {
    const { you, noughts, crosses, marksMade, playAgain } = this.props;
    return (
      <div className="w-100">
        <NavigationBarContainer />
        <GameBarContainer />

        <div className="container centered-container w-100 game-container">
          <Board
            noughts={noughts}
            crosses={crosses}
            marksMade={marksMade}
            you={you}
          />
          <Button
            className="footer-playagain navbar-button ml-auto"
            onClick={playAgain}
          >
            Play Again!
          </Button>
        </div>

        <MagmoLogoContainer />
        <GameFooterContainer />
      </div>
    );
  }
}
