import * as React from 'react';

import { Button } from 'reactstrap';

import { Move, Result } from '../core';
import { MoveBadge } from './MoveBadge';
import { GameLayout } from './GameLayout';

interface Props {
  yourMove: Move;
  theirMove: Move;
  result: Result;
  message: string;
  playAgain: () => void;
}

export default class ResultPage extends React.PureComponent<Props> {
  renderResultText() {
    const { result } = this.props;

    switch (result) {
      case Result.YouWin:
        return 'You won! 🎉';

      case Result.YouLose:
        return 'You lost 😭';

      default:
        return "It's a tie! 🙄";
    }
  }

  render() {
    const { yourMove, theirMove, playAgain } = this.props;

    return (
      <GameLayout>
        <div className="w-100 text-center">
          <h1 className="mb-5">{this.renderResultText()}</h1>
          <div className="row">
            <div className="col-sm-6">
              <p className="lead">
                You chose <strong>{Move[yourMove]}</strong>
              </p>
              <div>
                <MoveBadge move={yourMove} />
              </div>
            </div>
            <div className="col-sm-6">
              <p className="lead">
                Your opponent chose <strong>{Move[theirMove]}</strong>
              </p>
              <div>
                <MoveBadge move={theirMove} />
              </div>
            </div>
          </div>

          <Button className="cog-button" onClick={playAgain}>
            Play again
          </Button>
        </div>
      </GameLayout>
    );
  }
}
