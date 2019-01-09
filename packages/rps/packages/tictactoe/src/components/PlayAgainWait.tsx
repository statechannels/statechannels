import React from 'react';
import { Marks, Marker, Result, Player, Imperative } from '../core';
import GameScreen from './GameScreen';
import { Button } from 'reactstrap';


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

export default class PlayAgainWait extends React.PureComponent<Props> {
  render() {
    const { noughts, crosses, you, player, result, onScreenBalances, marksMade, playAgain, resign } = this.props;
    return (
      <div>
        <GameScreen
        noughts={noughts}
        crosses={crosses}
        you={you} 
        player={player}
        result={result}
        onScreenBalances={onScreenBalances}
        marksMade={marksMade}
        resign={resign}
        />
        <Button className="cog-button homePage-loginButton" onClick={playAgain} >
        Waiting...
        </Button>
      </div>
    );
  }
}