import React from 'react';

import { Move } from '../core';

import { Button } from 'reactstrap';
import MoveIcon from './MoveIcon';
import { GameLayout } from './GameLayout';

interface Props {
  chooseMove: (move: Move) => void;
  resign: () => void;
  afterOpponent?: any;
  challengeExpirationDate?:number;

}

export default class SelectMoveStep extends React.PureComponent<Props> {
  renderChooseButton(chooseMove: (move: Move) => void, move: Move, description: string) {
    return (
      <Button onClick={() => chooseMove(move)} color="light" className="w-75 p-3">
        <div className="mb-3">
          <h1>{description}</h1>
          <MoveIcon move={move} />
        </div>
      </Button>
    );
  }

  render() {
    const { afterOpponent, chooseMove, resign, challengeExpirationDate } = this.props;
    const renderChooseButton = this.renderChooseButton;

    return (
      <GameLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">
          {challengeExpirationDate && `Challenge detected, respond by ${new Date(challengeExpirationDate).toString()}` }
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
          <div className="row w-100">
            <div className="col-sm-4">{renderChooseButton(chooseMove, Move.Rock, 'Rock')}</div>
            <div className="col-sm-4">{renderChooseButton(chooseMove, Move.Paper, 'Paper')}</div>
            <div className="col-sm-4">
              {renderChooseButton(chooseMove, Move.Scissors, 'Scissors')}
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={() => resign()} color="dark" className="w-75 p-3">
              <h1>Abandon game</h1>
            </Button>
          </div>
        </div>
      </GameLayout>
    );
  }
}
